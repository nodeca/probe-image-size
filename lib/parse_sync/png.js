'use strict'


var png = require('../common/png_parser')


module.exports = function (data) {
  var parser = new png.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
