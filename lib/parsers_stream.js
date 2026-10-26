'use strict'


var Transform = require('stream').Transform
var NEED_MORE = require('./common/utils').NEED_MORE


function wrapParser (Parser) {
  return function () {
    var parser = new Parser()

    return new Transform({
      readableObjectMode: true,
      transform: function (chunk, encoding, next) {
        if (parser.getStatus() === NEED_MORE) {
          parser.push(chunk)

          if (parser.getStatus() !== NEED_MORE) {
            var result = parser.getResult()
            if (result) this.push(result)
            this.push(null)
          }
        }

        next()
      },
      flush: function (next) {
        if (parser.getStatus() === NEED_MORE) {
          var result = parser.getResult()
          if (result) this.push(result)
        }
        next()
      }
    })
  }
}


module.exports = {
  avif: wrapParser(require('./formats/avif').Parser),
  bmp: wrapParser(require('./formats/bmp').Parser),
  gif: wrapParser(require('./formats/gif').Parser),
  ico: wrapParser(require('./formats/ico').Parser),
  jpeg: wrapParser(require('./formats/jpeg').Parser),
  png: wrapParser(require('./formats/png').Parser),
  psd: wrapParser(require('./formats/psd').Parser),
  svg: wrapParser(require('./formats/svg').Parser),
  tiff: wrapParser(require('./formats/tiff').Parser),
  webp: wrapParser(require('./formats/webp').Parser)
}
