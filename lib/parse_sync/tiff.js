'use strict'


var tiff = require('../common/tiff_parser')


module.exports = function (data) {
  var parser = new tiff.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
