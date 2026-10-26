'use strict'


var Transform = require('stream').Transform
var gif = require('../common/gif_parser')


module.exports = function () {
  var parser = new gif.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === gif.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== gif.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    }
  })
}
