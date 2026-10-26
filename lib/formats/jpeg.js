'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var readUInt16BE = require('../common/read_le_be').readUInt16BE
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var exifOrientation = require('../common/exif_orientation_parser')


var SIG_JPEG = str2arr('\xFF\xD8\xFF')
var SIG_EXIF = str2arr('Exif\0\0')

var S_SIGNATURE = 0
var S_MARKER_START = 1
var S_MARKER_CODE = 2
var S_SEGMENT_LENGTH = 3
var S_EXIF_SIGNATURE = 4
var S_EXIF_DATA = 5
var S_SOF = 6


function JpegParser () {
  this.partial_buffer = new Uint8Array(6)
  this.buffered_bytes = 0
  this.bytes_to_skip = 0
  this.segment_bytes_left = 0
  this.marker_code = 0
  this.orientation = 0
  this.orientation_parser = null
  this.state = S_SIGNATURE
  this.read_size = 3
  this.status = NEED_MORE
  this.result = undefined
}


JpegParser.prototype.push = function (chunk) {
  var chunk_offset = 0

  while (this.status === NEED_MORE && chunk_offset < chunk.length) {
    if (this.bytes_to_skip > 0) {
      var bytes_skipped = Math.min(this.bytes_to_skip, chunk.length - chunk_offset)
      this.bytes_to_skip -= bytes_skipped
      chunk_offset += bytes_skipped
      continue
    }

    if (this.state === S_EXIF_DATA) {
      var bytes_to_read = Math.min(this.segment_bytes_left, chunk.length - chunk_offset)
      this.orientation_parser.push(chunk.subarray(chunk_offset, chunk_offset + bytes_to_read))
      this.segment_bytes_left -= bytes_to_read
      chunk_offset += bytes_to_read

      if (this.orientation_parser.getStatus() === NEED_MORE && this.segment_bytes_left > 0) continue

      this.orientation = this.orientation_parser.orientation
      this.orientation_parser = null
      // Dimensions follow APP1, so consume the rest of the segment.
      this.bytes_to_skip = this.segment_bytes_left
      this.state = S_MARKER_START
      this.read_size = 1
      continue
    }

    var read_buffer = chunk
    var read_offset = chunk_offset

    if (this.buffered_bytes > 0 || chunk.length - chunk_offset < this.read_size) {
      var bytes_to_copy = Math.min(this.read_size - this.buffered_bytes, chunk.length - chunk_offset)
      this.partial_buffer.set(chunk.subarray(chunk_offset, chunk_offset + bytes_to_copy), this.buffered_bytes)
      this.buffered_bytes += bytes_to_copy
      chunk_offset += bytes_to_copy
      if (this.buffered_bytes < this.read_size) return

      read_buffer = this.partial_buffer
      read_offset = 0
      this.buffered_bytes = 0
    } else {
      chunk_offset += this.read_size
    }

    switch (this.state) {
      case S_SIGNATURE:
        // Require SOI immediately followed by another marker.
        if (!sliceEq(read_buffer, read_offset, SIG_JPEG)) {
          this.status = FAIL
          return
        }

        this.state = S_MARKER_CODE
        this.read_size = 1
        break

      case S_MARKER_START:
        // Tolerate extra bytes between segments, see issue #68.
        if (read_buffer[read_offset] === 0xFF) this.state = S_MARKER_CODE
        break

      case S_MARKER_CODE:
        var code = read_buffer[read_offset]
        if (code === 0xFF) break // Marker padding.

        if (code === 0xD9 /* EOI */ || code === 0xDA /* SOS */) {
          this.status = FAIL
          return
        }

        // Standalone markers have no length or payload.
        if ((code >= 0xD0 && code <= 0xD8) || code === 0x01) {
          this.state = S_MARKER_START
          break
        }

        if (code < 0xC0 || code > 0xFE) {
          this.status = FAIL
          return
        }

        this.marker_code = code
        this.state = S_SEGMENT_LENGTH
        this.read_size = 2
        break

      case S_SEGMENT_LENGTH:
        this.segment_bytes_left = readUInt16BE(read_buffer, read_offset) - 2

        if (this.segment_bytes_left < 0) {
          this.status = FAIL
          return
        }

        if (this.marker_code === 0xE1 && this.segment_bytes_left >= 10) {
          this.state = S_EXIF_SIGNATURE
          this.read_size = 6
        } else if (this.segment_bytes_left >= 5 &&
                   this.marker_code >= 0xC0 && this.marker_code <= 0xCF &&
                   this.marker_code !== 0xC4 && this.marker_code !== 0xC8 && this.marker_code !== 0xCC) {
          this.state = S_SOF
          this.read_size = 5
        } else {
          this.bytes_to_skip = this.segment_bytes_left
          this.state = S_MARKER_START
          this.read_size = 1
        }
        break

      case S_EXIF_SIGNATURE:
        this.segment_bytes_left -= 6
        if (sliceEq(read_buffer, read_offset, SIG_EXIF)) {
          this.orientation_parser = new exifOrientation.Parser()
          this.state = S_EXIF_DATA
        } else {
          this.bytes_to_skip = this.segment_bytes_left
          this.state = S_MARKER_START
          this.read_size = 1
        }
        break

      case S_SOF:
        this.result = {
          width: readUInt16BE(read_buffer, read_offset + 3),
          height: readUInt16BE(read_buffer, read_offset + 1),
          type: 'jpg',
          mime: 'image/jpeg',
          wUnits: 'px',
          hUnits: 'px'
        }
        if (this.orientation > 0) this.result.orientation = this.orientation
        this.status = DONE
        break
    }
  }
}


JpegParser.prototype.getStatus = function () {
  return this.status
}


JpegParser.prototype.getResult = function () {
  return this.result
}


exports.Parser = JpegParser
