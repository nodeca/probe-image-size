'use strict'


var svgHeader = require('../common/svg_header_parser')


module.exports = function (data) {
  var parser = new svgHeader.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
