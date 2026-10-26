'use strict'


var psd = require('../common/psd_parser')


module.exports = function (data) {
  var parser = new psd.Parser()

  // Legacy support for plain arrays.
  if (Array.isArray(data)) data = new Uint8Array(data)

  parser.push(data)

  return parser.getResult()
}
