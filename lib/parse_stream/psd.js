'use strict'


var Transform = require('stream').Transform
var psd = require('../common/psd_parser')


module.exports = function () {
  var parser = new psd.Parser()

  return new Transform({
    readableObjectMode: true,
    transform: function (chunk, encoding, next) {
      if (parser.getStatus() === psd.NEED_MORE) {
        parser.push(chunk)

        if (parser.getStatus() !== psd.NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
          this.push(null)
        }
      }

      next()
    }
  })
}
