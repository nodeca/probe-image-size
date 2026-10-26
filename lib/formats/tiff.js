'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var readLeBe = require('../common/read_le_be')


var SIG_LE = str2arr('II\x2A\0')
var SIG_BE = str2arr('MM\0\x2A')

var S_HEADER = 0
var S_IFD_ENTRY_COUNT = 1
var S_IFD_ENTRY = 2


function readUInt16 (data, offset, big_endian) {
  return big_endian ? readLeBe.readUInt16BE(data, offset) : readLeBe.readUInt16LE(data, offset)
}


function readUInt32 (data, offset, big_endian) {
  return big_endian ? readLeBe.readUInt32BE(data, offset) : readLeBe.readUInt32LE(data, offset)
}


function readIFDValue (data, offset, big_endian) {
  var type = readUInt16(data, offset + 2, big_endian)
  var value_count = readUInt32(data, offset + 4, big_endian)

  if (value_count !== 1 || (type !== 3 && type !== 4)) return null

  return type === 3 ? readUInt16(data, offset + 8, big_endian) : readUInt32(data, offset + 8, big_endian)
}


function TiffParser () {
  this.partial_buffer = new Uint8Array(12)
  this.buffered_bytes = 0
  this.bytes_to_skip = 0
  this.entries_left = 0
  this.big_endian = false
  this.width = 0
  this.height = 0
  this.state = S_HEADER
  this.status = NEED_MORE
  this.result = undefined
}


TiffParser.prototype.push = function (chunk) {
  var chunk_offset = 0

  while (this.status === NEED_MORE && chunk_offset < chunk.length) {
    if (this.bytes_to_skip > 0) {
      var bytes_skipped = Math.min(this.bytes_to_skip, chunk.length - chunk_offset)
      this.bytes_to_skip -= bytes_skipped
      chunk_offset += bytes_skipped
      continue
    }

    var read_size = this.state === S_HEADER ? 8 : this.state === S_IFD_ENTRY_COUNT ? 2 : 12
    var read_buffer = chunk
    var read_offset = chunk_offset

    if (this.buffered_bytes > 0 || chunk.length - chunk_offset < read_size) {
      var bytes_to_copy = Math.min(read_size - this.buffered_bytes, chunk.length - chunk_offset)
      this.partial_buffer.set(chunk.subarray(chunk_offset, chunk_offset + bytes_to_copy), this.buffered_bytes)
      this.buffered_bytes += bytes_to_copy
      chunk_offset += bytes_to_copy
      if (this.buffered_bytes < read_size) return

      read_buffer = this.partial_buffer
      read_offset = 0
      this.buffered_bytes = 0
    } else {
      chunk_offset += read_size
    }

    switch (this.state) {
      case S_HEADER:
        if (!sliceEq(read_buffer, read_offset, SIG_LE) && !sliceEq(read_buffer, read_offset, SIG_BE)) {
          this.status = FAIL
          return
        }

        this.big_endian = read_buffer[read_offset] === 0x4D
        var ifd_offset = readUInt32(read_buffer, read_offset + 4, this.big_endian)

        if (ifd_offset < 8) {
          this.status = FAIL
          return
        }

        this.bytes_to_skip = ifd_offset - 8
        this.state = S_IFD_ENTRY_COUNT
        break

      case S_IFD_ENTRY_COUNT:
        this.entries_left = readUInt16(read_buffer, read_offset, this.big_endian)

        if (this.entries_left === 0) {
          this.status = FAIL
          return
        }

        this.state = S_IFD_ENTRY
        break

      case S_IFD_ENTRY:
        var tag = readUInt16(read_buffer, read_offset, this.big_endian)

        if (tag === 256) {
          this.width = readIFDValue(read_buffer, read_offset, this.big_endian)
        } else if (tag === 257) {
          this.height = readIFDValue(read_buffer, read_offset, this.big_endian)
        }

        this.entries_left--
        if (this.entries_left === 0) {
          if (!this.width || !this.height) {
            this.status = FAIL
            return
          }

          this.result = {
            width: this.width,
            height: this.height,
            type: 'tiff',
            mime: 'image/tiff',
            wUnits: 'px',
            hUnits: 'px'
          }
          this.status = DONE
        }
        break
    }
  }
}


TiffParser.prototype.getStatus = function () {
  return this.status
}


TiffParser.prototype.getResult = function () {
  return this.result
}


exports.Parser = TiffParser
