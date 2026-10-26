'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var readUInt16LE = require('../common/read_le_be').readUInt16LE


var S_HEADER = 0
var S_INDEX_ENTRY = 1

var TYPE_ICO = 1
var INDEX_ENTRY_SIZE = 16


// Format specification:
// https://en.wikipedia.org/wiki/ICO_(file_format)#Icon_resource_structure
function IcoParser () {
  this.partial_buffer = new Uint8Array(INDEX_ENTRY_SIZE)
  this.buffered_bytes = 0
  this.entries_left = 0
  this.variants = []
  this.max_size = { width: 0, height: 0 }
  this.state = S_HEADER
  this.status = NEED_MORE
  this.result = undefined
}


IcoParser.prototype.push = function (chunk) {
  var chunk_offset = 0

  while (this.status === NEED_MORE && chunk_offset < chunk.length) {
    var read_size = this.state === S_HEADER ? 6 : INDEX_ENTRY_SIZE
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
        var reserved = readUInt16LE(read_buffer, read_offset)
        var type = readUInt16LE(read_buffer, read_offset + 2)
        this.entries_left = readUInt16LE(read_buffer, read_offset + 4)

        if (reserved !== 0 || type !== TYPE_ICO || this.entries_left === 0) {
          this.status = FAIL
          return
        }

        this.state = S_INDEX_ENTRY
        break

      case S_INDEX_ENTRY:
        var width = read_buffer[read_offset] || 256
        var height = read_buffer[read_offset + 1] || 256
        var size = { width: width, height: height }
        this.variants.push(size)

        if (width > this.max_size.width || height > this.max_size.height) this.max_size = size

        this.entries_left--
        if (this.entries_left === 0) {
          this.result = {
            width: this.max_size.width,
            height: this.max_size.height,
            variants: this.variants,
            type: 'ico',
            mime: 'image/x-icon',
            wUnits: 'px',
            hUnits: 'px'
          }
          this.status = DONE
        }
        break
    }
  }
}


IcoParser.prototype.getStatus = function () {
  return this.status
}


IcoParser.prototype.getResult = function () {
  return this.result
}


exports.Parser = IcoParser
