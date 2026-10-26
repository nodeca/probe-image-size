'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var readUInt32BE = require('../common/read_le_be').readUInt32BE
var miafFtyp = require('../common/miaf_ftyp_parser')
var miafMeta = require('../common/miaf_meta_parser')
var exifOrientation = require('../common/exif_orientation_parser')


var S_BOX_HEADER = 0
var S_FTYP = 1
var S_META = 2
var S_EXIF_OFFSET = 3
var S_EXIF_DATA = 4


function MiafParser () {
  this.partial_buffer = new Uint8Array(8)
  this.buffered_bytes = 0
  this.bytes_to_skip = 0
  this.bytes_left = 0
  this.position = 0
  this.state = S_BOX_HEADER
  this.status = NEED_MORE
  this.data_parser = null
  this.file_type = null
  this.result = undefined
}


MiafParser.prototype.push = function (chunk) {
  var chunk_offset = 0

  while (this.status === NEED_MORE && chunk_offset < chunk.length) {
    if (this.bytes_to_skip > 0) {
      var bytes_skipped = Math.min(this.bytes_to_skip, chunk.length - chunk_offset)
      this.bytes_to_skip -= bytes_skipped
      this.position += bytes_skipped
      chunk_offset += bytes_skipped
      continue
    }

    if (this.state === S_FTYP || this.state === S_META || this.state === S_EXIF_DATA) {
      var bytes_to_read = Math.min(this.bytes_left, chunk.length - chunk_offset)
      this.data_parser.push(chunk.subarray(chunk_offset, chunk_offset + bytes_to_read))
      this.bytes_left -= bytes_to_read
      this.position += bytes_to_read
      chunk_offset += bytes_to_read

      if (this.data_parser.getStatus() === NEED_MORE && this.bytes_left > 0) continue

      switch (this.state) {
        case S_FTYP:
          this.file_type = this.data_parser.getResult()
          this.data_parser = null
          if (!this.file_type) {
            this.status = FAIL
            return
          }
          this.state = S_BOX_HEADER
          break

        case S_META:
          var image = this.data_parser.getResult()
          this.data_parser = null
          if (!image) {
            this.status = FAIL
            return
          }

          this.result = {
            width: image.width,
            height: image.height,
            type: this.file_type.type,
            mime: this.file_type.mime,
            wUnits: 'px',
            hUnits: 'px'
          }
          if (image.variants.length > 1) this.result.variants = image.variants
          if (image.orientation) this.result.orientation = image.orientation

          var location = image.exif_location
          // EXIF behind the current position cannot be read from a forward-only stream.
          if (!location || !Number.isSafeInteger(location.offset) || !Number.isSafeInteger(location.length) ||
              !Number.isSafeInteger(location.offset + location.length) ||
              location.offset <= this.position || location.length < 4) {
            this.status = DONE
            return
          }

          this.bytes_to_skip = location.offset - this.position
          this.bytes_left = location.length
          this.state = S_EXIF_OFFSET
          break

        case S_EXIF_DATA:
          if (this.data_parser.orientation > 0) this.result.orientation = this.data_parser.orientation
          this.data_parser = null
          this.status = DONE
          break
      }
      continue
    }

    var read_size = this.state === S_EXIF_OFFSET ? 4 : 8
    var read_buffer = chunk
    var read_offset = chunk_offset

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
      case S_BOX_HEADER:
        var box_size = readUInt32BE(read_buffer, read_offset)
        var box_type = String.fromCharCode(
          read_buffer[read_offset + 4], read_buffer[read_offset + 5],
          read_buffer[read_offset + 6], read_buffer[read_offset + 7]
        )

        // Only ordinary 32-bit box sizes and metadata preceding mdat are supported.
        if (box_size < 8 || !Number.isSafeInteger(this.position + box_size - 8) || box_type === 'mdat') {
          this.status = FAIL
          return
        }

        this.bytes_left = box_size - 8

        if (!this.file_type) {
          if (box_type !== 'ftyp') {
            this.status = FAIL
            return
          }
          this.data_parser = new miafFtyp.Parser(this.bytes_left)
          this.state = S_FTYP
        } else if (box_type === 'meta' && this.bytes_left > 0) {
          this.data_parser = new miafMeta.Parser(this.bytes_left)
          this.state = S_META
        } else {
          this.bytes_to_skip = this.bytes_left
          continue
        }

        if (this.data_parser.getStatus() !== NEED_MORE) this.status = FAIL
        break

      case S_EXIF_OFFSET:
        var tiff_offset = readUInt32BE(read_buffer, read_offset)
        this.bytes_left -= 4

        if (tiff_offset >= this.bytes_left) {
          this.status = DONE
          return
        }

        this.bytes_to_skip = tiff_offset
        this.bytes_left -= tiff_offset
        this.data_parser = new exifOrientation.Parser()
        this.state = S_EXIF_DATA
        break
    }
  }
}


MiafParser.prototype.getStatus = function () {
  return this.status
}


MiafParser.prototype.getResult = function () {
  // Incomplete EXIF does not invalidate dimensions already read from meta.
  return this.result
}


exports.Parser = MiafParser
