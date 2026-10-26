'use strict'


var ico = require('../common/ico_parser')


module.exports = function (data) {
  var parser = new ico.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
