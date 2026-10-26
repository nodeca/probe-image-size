'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var readUInt16LE = require('../common/read_le_be').readUInt16LE


var SIG_GIF87a = str2arr('GIF87a')
var SIG_GIF89a = str2arr('GIF89a')



function GifParser () {
  this.partial_buffer = new Uint8Array(10)
  this.buffered_bytes = 0
  this.status = NEED_MORE
  this.result = undefined
}


GifParser.prototype.push = function (chunk) {
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

  if (!sliceEq(data, 0, SIG_GIF87a) && !sliceEq(data, 0, SIG_GIF89a)) {
    this.status = FAIL
    return
  }

  this.result = {
    width: readUInt16LE(data, 6),
    height: readUInt16LE(data, 8),
    type: 'gif',
    mime: 'image/gif',
    wUnits: 'px',
    hUnits: 'px'
  }
  this.status = DONE
}


GifParser.prototype.getStatus = function () {
  return this.status
}


GifParser.prototype.getResult = function () {
  return this.result
}


exports.Parser = GifParser
