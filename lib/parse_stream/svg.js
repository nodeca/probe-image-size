'use strict'


var Transform = require('stream').Transform
var svgHeader = require('../common/svg_header_parser')


module.exports = function () {
  var header = new svgHeader.Parser()

  var parser = new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (header.getStatus() > 0) {
        next()
        return
      }

      header.push(chunk)

      if (header.getStatus() > 0) {
        if (header.getStatus() === svgHeader.DONE) {
          var result = svgHeader.getSize(header.attrs)

          if (result) parser.push(result)
        }

        parser.push(null)
      }

      next()
    },

    flush: function () {
      if (header.getStatus() === 0) parser.push(null)
    }
  })

  return parser
}
