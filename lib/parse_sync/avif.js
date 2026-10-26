'use strict'


var miaf = require('../common/miaf_parser')


module.exports = function (data) {
  var parser = new miaf.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
