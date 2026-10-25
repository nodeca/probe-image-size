'use strict'

var ParserStream = require('../common/utils').ParserStream

var HEADER = 0
var TYPE_ICO = 1
var INDEX_SIZE = 16
var INDEX_READ_SIZE = 4096 // 256 complete 16-byte entries

// Format specification:
// https://en.wikipedia.org/wiki/ICO_(file_format)#Icon_resource_structure
module.exports = function () {
  var parser = new ParserStream()

  parser._bytes(6, function (data) {
    var header = data.readUInt16LE(0)
    var type = data.readUInt16LE(2)
    var numImages = data.readUInt16LE(4)

    if (header !== HEADER || type !== TYPE_ICO || !numImages) {
      parser._skipBytes(Infinity)
      parser.push(null)
      return
    }

    var entries_left = numImages
    var variants = []
    var maxSize = { width: 0, height: 0 }

    function onIndexChunk (indexData) {
      for (var entry_offset = 0; entry_offset < indexData.length; entry_offset += INDEX_SIZE) {
        var width = indexData.readUInt8(entry_offset) || 256
        var height = indexData.readUInt8(entry_offset + 1) || 256
        var size = { width: width, height: height }
        variants.push(size)

        if (width > maxSize.width || height > maxSize.height) {
          maxSize = size
        }
      }

      entries_left -= indexData.length / INDEX_SIZE

      if (entries_left > 0) {
        parser._bytes(Math.min(entries_left * INDEX_SIZE, INDEX_READ_SIZE), onIndexChunk)
        return
      }

      parser._skipBytes(Infinity)

      parser.push({
        width: maxSize.width,
        height: maxSize.height,
        variants: variants,
        type: 'ico',
        mime: 'image/x-icon',
        wUnits: 'px',
        hUnits: 'px'
      })
      parser.push(null)
    }

    parser._bytes(Math.min(entries_left * INDEX_SIZE, INDEX_READ_SIZE), onIndexChunk)
  })

  return parser
}
