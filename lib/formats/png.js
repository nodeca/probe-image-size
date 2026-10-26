'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var readUInt32BE = require('../common/read_le_be').readUInt32BE


var SIG_PNG = str2arr('\x89PNG\r\n\x1a\n')
var SIG_IHDR = str2arr('IHDR')



function PngParser () {
  this.partial_buffer = new Uint8Array(24)
  this.buffered_bytes = 0
  this.status = NEED_MORE
  this.result = undefined
}


PngParser.prototype.push = function (chunk) {
  if (this.status !== NEED_MORE) return

  var data = chunk
  var read_size = this.partial_buffer.length

  if (this.buffered_bytes > 0 || chunk.length < read_size) {
    var bytes_to_copy = Math.min(read_size - this.buffered_bytes, chunk.length)
    this.partial_buffer.set(chunk.subarray(0, bytes_to_copy), this.buffered_bytes)
    this.buffered_bytes += bytes_to_copy
    if (this.buffered_bytes < read_size) return
    data = this.partial_buffer
  }

  if (!sliceEq(data, 0, SIG_PNG)) {
    this.status = FAIL
    return
  }

  // check that first chunk is IHDR
  if (!sliceEq(data, 12, SIG_IHDR)) {
    this.status = FAIL
    return
  }

  this.result = {
    width: readUInt32BE(data, 16),
    height: readUInt32BE(data, 20),
    type: 'png',
    mime: 'image/png',
    wUnits: 'px',
    hUnits: 'px'
  }
  this.status = DONE
}


PngParser.prototype.getStatus = function () {
  return this.status
}


PngParser.prototype.getResult = function () {
  return this.result
}


exports.Parser = PngParser
