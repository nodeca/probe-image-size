'use strict'


var jpeg = require('../common/jpeg_parser')


module.exports = function (data) {
  var parser = new jpeg.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
