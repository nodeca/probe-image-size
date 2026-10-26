'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var readUInt16LE = require('../common/read_le_be').readUInt16LE
var readUInt32LE = require('../common/read_le_be').readUInt32LE
var exifOrientation = require('../common/exif_orientation_parser')


var SIG_RIFF = str2arr('RIFF')
var SIG_WEBP = str2arr('WEBP')


function parseVP8 (data, offset) {
  if (data[offset + 3] !== 0x9D || data[offset + 4] !== 0x01 || data[offset + 5] !== 0x2A) {
    // bad code block signature
    return
  }

  return {
    width: readUInt16LE(data, offset + 6) & 0x3FFF,
    height: readUInt16LE(data, offset + 8) & 0x3FFF,
    type: 'webp',
    mime: 'image/webp',
    wUnits: 'px',
    hUnits: 'px'
  }
}


function parseVP8L (data, offset) {
  if (data[offset] !== 0x2F) return

  var bits = readUInt32LE(data, offset + 1)

  return {
    width: (bits & 0x3FFF) + 1,
    height: ((bits >> 14) & 0x3FFF) + 1,
    type: 'webp',
    mime: 'image/webp',
    wUnits: 'px',
    hUnits: 'px'
  }
}


function parseVP8X (data, offset) {
  return {
    width: ((data[offset + 6] << 16) | (data[offset + 5] << 8) | data[offset + 4]) + 1,
    height: ((data[offset + 9] << 16) | (data[offset + 8] << 8) | data[offset + 7]) + 1,
    type: 'webp',
    mime: 'image/webp',
    wUnits: 'px',
    hUnits: 'px'
  }
}


var S_RIFF_HEADER = 0
var S_CHUNK_HEADER = 1
var S_VP8 = 2
var S_VP8L = 3
var S_VP8X = 4
var S_EXIF_DATA = 5


function WebpParser () {
  this.partial_buffer = new Uint8Array(12)
  this.buffered_bytes = 0
  this.bytes_to_skip = 0
  this.chunk_bytes_left = 0
  this.position = 0
  this.file_end = 0
  this.orientation_parser = null
  this.state = S_RIFF_HEADER
  this.read_size = 12
  this.status = NEED_MORE
  this.result = undefined
}


WebpParser.prototype.push = function (chunk) {
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

    if (this.state === S_CHUNK_HEADER && this.buffered_bytes === 0) {
      // Skip zero padding between RIFF chunks.
      while (chunk_offset < chunk.length && chunk[chunk_offset] === 0 && this.position + 8 < this.file_end) {
        chunk_offset++
        this.position++
      }

      if (this.position + 8 >= this.file_end) {
        this.status = this.result ? DONE : FAIL
        return
      }
    }

    if (chunk_offset === chunk.length) return

    if (this.state === S_EXIF_DATA) {
      var bytes_to_read = Math.min(this.chunk_bytes_left, chunk.length - chunk_offset)
      this.orientation_parser.push(chunk.subarray(chunk_offset, chunk_offset + bytes_to_read))
      this.chunk_bytes_left -= bytes_to_read
      this.position += bytes_to_read
      chunk_offset += bytes_to_read

      if (this.orientation_parser.getStatus() === NEED_MORE && this.chunk_bytes_left > 0) continue

      if (this.result && this.orientation_parser.orientation > 0) {
        this.result.orientation = this.orientation_parser.orientation
      }
      this.orientation_parser = null
      // EXIF is the last chunk needed for the result.
      this.status = this.result ? DONE : FAIL
      return
    }

    var read_buffer = chunk
    var read_offset = chunk_offset

    if (this.buffered_bytes > 0 || chunk.length - chunk_offset < this.read_size) {
      var bytes_to_copy = Math.min(this.read_size - this.buffered_bytes, chunk.length - chunk_offset)
      this.partial_buffer.set(chunk.subarray(chunk_offset, chunk_offset + bytes_to_copy), this.buffered_bytes)
      this.buffered_bytes += bytes_to_copy
      this.position += bytes_to_copy
      chunk_offset += bytes_to_copy
      if (this.buffered_bytes < this.read_size) return

      read_buffer = this.partial_buffer
      read_offset = 0
      this.buffered_bytes = 0
    } else {
      chunk_offset += this.read_size
      this.position += this.read_size
    }

    switch (this.state) {
      case S_RIFF_HEADER:
        if (!sliceEq(read_buffer, read_offset, SIG_RIFF) || !sliceEq(read_buffer, read_offset + 8, SIG_WEBP)) {
          this.status = FAIL
          return
        }

        this.file_end = readUInt32LE(read_buffer, read_offset + 4) + 8
        this.state = S_CHUNK_HEADER
        this.read_size = 8
        continue

      case S_CHUNK_HEADER:
        var type = String.fromCharCode(
          read_buffer[read_offset], read_buffer[read_offset + 1],
          read_buffer[read_offset + 2], read_buffer[read_offset + 3]
        )
        this.chunk_bytes_left = readUInt32LE(read_buffer, read_offset + 4)

        if (type === 'VP8 ' && this.chunk_bytes_left >= 10) {
          this.state = S_VP8
          this.read_size = 10
        } else if (type === 'VP8L' && this.chunk_bytes_left >= 5) {
          this.state = S_VP8L
          this.read_size = 5
        } else if (type === 'VP8X' && this.chunk_bytes_left >= 10) {
          this.state = S_VP8X
          this.read_size = 10
        } else if (type === 'EXIF' && this.chunk_bytes_left >= 4) {
          this.orientation_parser = new exifOrientation.Parser()
          this.state = S_EXIF_DATA
        } else {
          this.bytes_to_skip = this.chunk_bytes_left
        }
        continue

      case S_VP8:
        this.result = this.result || parseVP8(read_buffer, read_offset)
        break

      case S_VP8L:
        this.result = this.result || parseVP8L(read_buffer, read_offset)
        break

      case S_VP8X:
        this.result = this.result || parseVP8X(read_buffer, read_offset)
        break
    }

    this.bytes_to_skip = this.chunk_bytes_left - this.read_size
    this.state = S_CHUNK_HEADER
    this.read_size = 8
  }
}


WebpParser.prototype.getStatus = function () {
  return this.status
}


WebpParser.prototype.getResult = function () {
  if (this.status === DONE) return this.result
}


exports.Parser = WebpParser
