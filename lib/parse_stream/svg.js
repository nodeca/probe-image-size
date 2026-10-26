'use strict'


var Transform = require('stream').Transform
var svgHeader = require('../common/svg_header_parser')


module.exports = function () {
  var parser = new svgHeader.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === svgHeader.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== svgHeader.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    },
    flush: function (next) {
      if (parser.getStatus() === svgHeader.NEED_MORE) {
        var result = parser.getResult()
        if (result) this.push(result)
      }
      next()
    }
  })
}
