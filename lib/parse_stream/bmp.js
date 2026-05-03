'use strict'


var ParserStream = require('../common').ParserStream
var str2arr = require('../common').str2arr
var sliceEq = require('../common').sliceEq


var SIG_BM = str2arr('BM')


module.exports = function () {
  var parser = new ParserStream()

  parser._bytes(26, function (data) {
    parser._skipBytes(Infinity)

    if (!sliceEq(data, 0, SIG_BM)) {
      parser.push(null)
      return
    }

    var w, h
    var headerSize = data.readUInt32LE(14)

    if (headerSize === 12) {
      // BMP v2 header
      w = data.readInt16LE(18)
      h = data.readInt16LE(20)
    } else if (headerSize > 12) {
      // BMP v3+ header
      w = data.readInt32LE(18)
      h = data.readInt32LE(22)
    } else {
      parser.push(null)
      return
    }

    parser.push({
      width: w,
      // Height can be negative to indicate a top-down bitmap
      height: Math.abs(h),
      type: 'bmp',
      mime: 'image/bmp',
      wUnits: 'px',
      hUnits: 'px'
    })

    parser.push(null)
  })

  return parser
}
