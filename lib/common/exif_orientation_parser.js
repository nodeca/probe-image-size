'use strict'


var NEED_MORE = require('./utils').NEED_MORE
var DONE = require('./utils').DONE
var FAIL = require('./utils').FAIL
var readLeBe = require('./read_le_be')


var S_TIFF_HEADER = 0
var S_IFD_ENTRY_COUNT = 1
var S_IFD_ENTRY = 2


function readUInt16 (data, offset, big_endian) {
  return big_endian ? readLeBe.readUInt16BE(data, offset) : readLeBe.readUInt16LE(data, offset)
}


function readUInt32 (data, offset, big_endian) {
  return big_endian ? readLeBe.readUInt32BE(data, offset) : readLeBe.readUInt32LE(data, offset)
}


function ExifOrientationParser () {
  this.partial_buffer = new Uint8Array(12)
  this.buffered_bytes = 0
  this.bytes_to_skip = 0
  this.entries_left = 0
  this.state = S_TIFF_HEADER
  this.status = NEED_MORE
  this.orientation = 0
  this.big_endian = false
}


// Input starts at the TIFF header, without the container's Exif prefix.
ExifOrientationParser.prototype.push = function (chunk) {
  var chunk_offset = 0

  while (this.status === NEED_MORE && chunk_offset < chunk.length) {
    if (this.bytes_to_skip > 0) {
      var bytes_skipped = Math.min(this.bytes_to_skip, chunk.length - chunk_offset)
      this.bytes_to_skip -= bytes_skipped
      chunk_offset += bytes_skipped
      continue
    }

    var read_size = this.state === S_TIFF_HEADER ? 8 : this.state === S_IFD_ENTRY_COUNT ? 2 : 12
    var read_buffer = chunk
    var read_offset = chunk_offset

    // Copy only fields split across chunks; complete fields are read in place.
    if (this.buffered_bytes > 0 || chunk.length - chunk_offset < read_size) {
      var bytes_to_copy = Math.min(read_size - this.buffered_bytes, chunk.length - chunk_offset)
      for (var i = 0; i < bytes_to_copy; i++) this.partial_buffer[this.buffered_bytes++] = chunk[chunk_offset++]
      if (this.buffered_bytes < read_size) return

      read_buffer = this.partial_buffer
      read_offset = 0
      this.buffered_bytes = 0
    } else {
      chunk_offset += read_size
    }

    switch (this.state) {
      case S_TIFF_HEADER:
        if (read_buffer[read_offset] === 0x49 && read_buffer[read_offset + 1] === 0x49 &&
            read_buffer[read_offset + 2] === 0x2A && read_buffer[read_offset + 3] === 0) {
          this.big_endian = false
        } else if (read_buffer[read_offset] === 0x4D && read_buffer[read_offset + 1] === 0x4D &&
                   read_buffer[read_offset + 2] === 0 && read_buffer[read_offset + 3] === 0x2A) {
          this.big_endian = true
        } else {
          this.status = FAIL
          return
        }

        var ifd0_offset = readUInt32(read_buffer, read_offset + 4, this.big_endian)

        if (ifd0_offset === 0) {
          this.status = DONE
        } else if (ifd0_offset < 8) {
          this.status = FAIL
        } else {
          this.bytes_to_skip = ifd0_offset - 8
          this.state = S_IFD_ENTRY_COUNT
        }
        break

      case S_IFD_ENTRY_COUNT:
        this.entries_left = readUInt16(read_buffer, read_offset, this.big_endian)
        this.state = S_IFD_ENTRY
        if (this.entries_left === 0) this.status = DONE
        break

      case S_IFD_ENTRY:
        if (readUInt16(read_buffer, read_offset, this.big_endian) === 0x0112 &&
            readUInt16(read_buffer, read_offset + 2, this.big_endian) === 3 &&
            readUInt32(read_buffer, read_offset + 4, this.big_endian) === 1) {
          var orientation = readUInt16(read_buffer, read_offset + 8, this.big_endian)

          if (orientation >= 1 && orientation <= 8) {
            this.orientation = orientation
            this.status = DONE
          }
        }

        this.entries_left--
        if (this.entries_left === 0) this.status = DONE
        break
    }
  }
}


ExifOrientationParser.prototype.getStatus = function () {
  return this.status
}


exports.Parser = ExifOrientationParser
