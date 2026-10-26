'use strict'


var Transform = require('stream').Transform
var jpeg = require('../common/jpeg_parser')


module.exports = function () {
  var parser = new jpeg.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === jpeg.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== jpeg.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    }
  })
}
