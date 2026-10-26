'use strict'


var Transform = require('stream').Transform
var ico = require('../common/ico_parser')


module.exports = function () {
  var parser = new ico.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === ico.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== ico.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    }
  })
}
