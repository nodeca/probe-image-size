'use strict'


var svgHeader = require('../common/svg_header')


module.exports = function (data) {
  var parser = new svgHeader.Parser()

  parser.push(data)

  if (parser.getStatus() !== svgHeader.DONE) return

  return svgHeader.getSize(parser.attrs)
}
