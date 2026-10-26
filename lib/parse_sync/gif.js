'use strict'


var gif = require('../common/gif_parser')


module.exports = function (data) {
  var parser = new gif.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
