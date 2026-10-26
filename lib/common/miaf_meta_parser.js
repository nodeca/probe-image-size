'use strict'


var NEED_MORE = require('./utils').NEED_MORE
var DONE = require('./utils').DONE
var FAIL = require('./utils').FAIL
var readUInt16BE = require('./read_le_be').readUInt16BE
var readUInt32BE = require('./read_le_be').readUInt32BE


var MAX_VARIANTS = 100
var MAX_ILOC_ITEMS = 1000

var S_META_HEADER = 0
var S_BOX_HEADER = 1
var S_ISPE = 2
var S_IROT = 3
var S_IMIR = 4
var S_IINF_HEADER = 5
var S_INFE = 6
var S_ILOC_HEADER = 7
var S_ILOC_ITEM = 8
var S_ILOC_EXTENT = 9

var ROTATE_CCW = [0, 6, 5, 8, 7, 4, 3, 2, 1]
var MIRROR_VERT = [0, 4, 3, 2, 1, 6, 5, 8, 7]


function readUIntBE (data, offset, size) {
  var value = 0
  for (var i = 0; i < size; i++) value = value * 256 + data[offset + i]
  return value
}


// meta_size includes version/flags, but excludes the outer box header.
function MiafMetaParser (meta_size) {
  // The two 4-bit iloc field widths can request 15 + 15 bytes.
  this.partial_buffer = new Uint8Array(30)
  this.buffered_bytes = 0
  this.bytes_to_skip = 0
  this.position = 0
  this.box_end = meta_size
  this.containers = [{ type: 'meta', end: meta_size }]
  this.state = S_META_HEADER
  this.read_size = 4
  this.status = Number.isSafeInteger(meta_size) && meta_size >= 4 ? NEED_MORE : FAIL

  this.variants = []
  this.orientation = null
  this.exif_item_id = 0
  this.item_locations = {}

  this.iloc_item_count = 0
  this.items_left = 0
  this.item_id = 0
  this.base_offset = 0
  this.offset_size = 0
  this.length_size = 0
  this.base_offset_size = 0
}


// Input starts at meta's version/flags. Only split fields are copied.
// Recognized paths are meta/iprp/ipco, meta/iinf/infe and meta/iloc;
// other boxes are skipped, so the container stack has at most three entries.
MiafMetaParser.prototype.push = function (chunk) {
  var chunk_offset = 0

  while (this.status === NEED_MORE) {
    if (this.bytes_to_skip > 0) {
      if (chunk_offset === chunk.length) return
      var bytes_skipped = Math.min(this.bytes_to_skip, chunk.length - chunk_offset)
      this.bytes_to_skip -= bytes_skipped
      this.position += bytes_skipped
      chunk_offset += bytes_skipped
      continue
    }

    if (this.state === S_BOX_HEADER && this.buffered_bytes === 0) {
      var container = this.containers[this.containers.length - 1]

      if (this.position === container.end || container.entries_left === 0) {
        this.bytes_to_skip = container.end - this.position
        this.containers.pop()
        if (this.containers.length === 0) this.status = DONE
        continue
      }

      this.box_end = container.end
    }

    if (this.read_size - this.buffered_bytes > this.box_end - this.position) {
      this.status = FAIL
      return
    }

    if (chunk_offset === chunk.length && this.read_size > 0) return

    var read_buffer = chunk
    var read_offset = chunk_offset
    var read_size = this.read_size

    if (this.buffered_bytes > 0 || chunk.length - chunk_offset < read_size) {
      var bytes_to_copy = Math.min(read_size - this.buffered_bytes, chunk.length - chunk_offset)
      for (var i = 0; i < bytes_to_copy; i++) this.partial_buffer[this.buffered_bytes++] = chunk[chunk_offset++]
      this.position += bytes_to_copy
      if (this.buffered_bytes < read_size) return

      read_buffer = this.partial_buffer
      read_offset = 0
      this.buffered_bytes = 0
    } else {
      chunk_offset += read_size
      this.position += read_size
    }

    switch (this.state) {
      case S_META_HEADER:
        this.state = S_BOX_HEADER
        this.read_size = 8
        continue

      case S_BOX_HEADER:
        var box_size = readUInt32BE(read_buffer, read_offset)
        var box_type = String.fromCharCode(
          read_buffer[read_offset + 4], read_buffer[read_offset + 5],
          read_buffer[read_offset + 6], read_buffer[read_offset + 7]
        )
        var parent = this.containers[this.containers.length - 1]

        // Only ordinary 32-bit box sizes are supported.
        if (box_size < 8 || box_size - 8 > parent.end - this.position) {
          this.status = FAIL
          return
        }

        this.box_end = this.position + box_size - 8
        if (parent.type === 'iinf') parent.entries_left--

        switch (parent.type + '/' + box_type) {
          case 'meta/iprp':
          case 'iprp/ipco':
            this.containers.push({ type: box_type, end: this.box_end })
            continue

          case 'ipco/ispe':
            this.state = S_ISPE
            this.read_size = 12
            continue

          case 'ipco/irot':
            this.state = S_IROT
            this.read_size = 1
            continue

          case 'ipco/imir':
            this.state = S_IMIR
            this.read_size = 1
            continue

          case 'meta/iinf':
            this.state = S_IINF_HEADER
            this.read_size = 6
            continue

          case 'iinf/infe':
            this.state = S_INFE
            // Header, "Exif" and its terminator; never retain the whole name.
            this.read_size = Math.min(13, box_size - 8)
            continue

          case 'meta/iloc':
            this.state = S_ILOC_HEADER
            this.read_size = 8
            continue
        }
        break

      case S_ISPE:
        if (this.variants.length >= MAX_VARIANTS) {
          this.status = FAIL
          return
        }
        this.variants.push({
          width: readUInt32BE(read_buffer, read_offset + 4),
          height: readUInt32BE(read_buffer, read_offset + 8)
        })
        break

      case S_IROT:
        this.orientation = this.orientation || 1
        var turns = read_buffer[read_offset] & 3
        for (var turn = 0; turn < turns; turn++) this.orientation = ROTATE_CCW[this.orientation]
        break

      case S_IMIR:
        this.orientation = MIRROR_VERT[this.orientation || 1]
        if (read_buffer[read_offset] & 1) {
          this.orientation = ROTATE_CCW[ROTATE_CCW[this.orientation]]
        }
        break

      case S_IINF_HEADER:
        this.containers.push({
          type: 'iinf',
          end: this.box_end,
          entries_left: readUInt16BE(read_buffer, read_offset + 4)
        })
        this.state = S_BOX_HEADER
        this.read_size = 8
        continue

      case S_INFE:
        if (read_size >= 12 &&
            read_buffer[read_offset + 8] === 0x45 && read_buffer[read_offset + 9] === 0x78 &&
            read_buffer[read_offset + 10] === 0x69 && read_buffer[read_offset + 11] === 0x66 &&
            (read_size === 12 || read_buffer[read_offset + 12] === 0)) {
          this.exif_item_id = readUInt16BE(read_buffer, read_offset + 4)
        }
        break

      case S_ILOC_HEADER:
        this.offset_size = read_buffer[read_offset + 4] >> 4
        this.length_size = read_buffer[read_offset + 4] & 15
        this.base_offset_size = read_buffer[read_offset + 5] >> 4
        this.items_left = readUInt16BE(read_buffer, read_offset + 6)
        this.iloc_item_count += this.items_left
        if (this.iloc_item_count > MAX_ILOC_ITEMS) {
          this.status = FAIL
          return
        }
        if (this.items_left > 0) {
          this.state = S_ILOC_ITEM
          this.read_size = 6 + this.base_offset_size
          continue
        }
        break

      case S_ILOC_ITEM:
        this.item_id = readUInt16BE(read_buffer, read_offset)
        var data_reference_index = readUInt16BE(read_buffer, read_offset + 2)
        this.base_offset = readUIntBE(read_buffer, read_offset + 4, this.base_offset_size)
        var extent_count = readUInt16BE(read_buffer, read_offset + 4 + this.base_offset_size)
        var extent_bytes = extent_count * (this.offset_size + this.length_size)
        this.items_left--

        if (extent_bytes > this.box_end - this.position) {
          this.status = FAIL
          return
        }

        if (data_reference_index === 0 && extent_count === 1) {
          this.state = S_ILOC_EXTENT
          this.read_size = this.offset_size + this.length_size
          continue
        }

        if (this.items_left > 0) {
          this.bytes_to_skip = extent_bytes
          continue
        }
        break

      case S_ILOC_EXTENT:
        this.item_locations[this.item_id] = {
          offset: this.base_offset + readUIntBE(read_buffer, read_offset, this.offset_size),
          length: readUIntBE(read_buffer, read_offset + this.offset_size, this.length_size)
        }
        if (this.items_left > 0) {
          this.state = S_ILOC_ITEM
          this.read_size = 6 + this.base_offset_size
          continue
        }
        break
    }

    this.bytes_to_skip = this.box_end - this.position
    this.state = S_BOX_HEADER
    this.read_size = 8
  }
}


MiafMetaParser.prototype.getStatus = function () {
  return this.status
}


MiafMetaParser.prototype.getResult = function () {
  if (this.status !== DONE || this.variants.length === 0) return

  // Choose the image with the largest single dimension.
  var maxWidthSize = this.variants.reduce(function (a, b) {
    return a.width > b.width || (a.width === b.width && a.height > b.height) ? a : b
  })
  var maxHeightSize = this.variants.reduce(function (a, b) {
    return a.height > b.height || (a.height === b.height && a.width > b.width) ? a : b
  })
  var maxSize = maxHeightSize

  if (maxWidthSize.width > maxHeightSize.height ||
      (maxWidthSize.width === maxHeightSize.height && maxWidthSize.height > maxHeightSize.width)) {
    maxSize = maxWidthSize
  }

  return {
    width: maxSize.width,
    height: maxSize.height,
    orientation: this.orientation,
    variants: this.variants,
    exif_location: this.exif_item_id ? this.item_locations[this.exif_item_id] : null
  }
}


exports.Parser = MiafMetaParser
