'use strict'


var Transform = require('stream').Transform
var bmp = require('../common/bmp_parser')


module.exports = function () {
  var parser = new bmp.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === bmp.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== bmp.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    }
  })
}
