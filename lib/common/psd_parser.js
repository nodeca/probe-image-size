'use strict'


var str2arr = require('./utils').str2arr
var sliceEq = require('./utils').sliceEq
var readUInt32BE = require('./read_le_be').readUInt32BE


var SIG_8BPS = str2arr('8BPS\x00\x01')


var NEED_MORE = 0
var DONE = 1
var FAIL = 2


function PsdParser () {
  this.partial_buffer = new Uint8Array(22)
  this.buffered_bytes = 0
  this.status = NEED_MORE
  this.result = undefined
}


PsdParser.prototype.push = function (chunk) {
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

  if (!sliceEq(data, 0, SIG_8BPS)) {
    this.status = FAIL
    return
  }

  this.result = {
    width: readUInt32BE(data, 18),
    height: readUInt32BE(data, 14),
    type: 'psd',
    mime: 'image/vnd.adobe.photoshop',
    wUnits: 'px',
    hUnits: 'px'
  }
  this.status = DONE
}


PsdParser.prototype.getStatus = function () {
  return this.status
}


PsdParser.prototype.getResult = function () {
  return this.result
}


exports.NEED_MORE = NEED_MORE
exports.DONE = DONE
exports.FAIL = FAIL
exports.Parser = PsdParser
