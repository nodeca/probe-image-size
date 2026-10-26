'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var readInt16LE = require('../common/read_le_be').readInt16LE
var readInt32LE = require('../common/read_le_be').readInt32LE
var readUInt32LE = require('../common/read_le_be').readUInt32LE


var SIG_BM = str2arr('BM')



function BmpParser () {
  this.partial_buffer = new Uint8Array(26)
  this.buffered_bytes = 0
  this.status = NEED_MORE
  this.result = undefined
}


BmpParser.prototype.push = function (chunk) {
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

  if (!sliceEq(data, 0, SIG_BM)) {
    this.status = FAIL
    return
  }

  var height
  var width
  var header_size = readUInt32LE(data, 14)

  if (header_size === 12) {
    // BMP v2 header
    width = readInt16LE(data, 18)
    height = readInt16LE(data, 20)
  } else if (header_size > 12) {
    // BMP v3+ header
    width = readInt32LE(data, 18)
    height = readInt32LE(data, 22)
  } else {
    this.status = FAIL
    return
  }

  this.result = {
    width: width,
    // Height can be negative to indicate a top-down bitmap
    height: Math.abs(height),
    type: 'bmp',
    mime: 'image/bmp',
    wUnits: 'px',
    hUnits: 'px'
  }
  this.status = DONE
}


BmpParser.prototype.getStatus = function () {
  return this.status
}


BmpParser.prototype.getResult = function () {
  return this.result
}


exports.Parser = BmpParser
