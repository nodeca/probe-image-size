'use strict'


var Transform = require('stream').Transform
var tiff = require('../common/tiff_parser')


module.exports = function () {
  var parser = new tiff.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === tiff.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== tiff.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    }
  })
}
