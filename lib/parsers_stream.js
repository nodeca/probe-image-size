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
  avif: wrapParser(require('./common/miaf_parser').Parser),
  bmp: wrapParser(require('./common/bmp_parser').Parser),
  gif: wrapParser(require('./common/gif_parser').Parser),
  ico: wrapParser(require('./common/ico_parser').Parser),
  jpeg: wrapParser(require('./common/jpeg_parser').Parser),
  png: wrapParser(require('./common/png_parser').Parser),
  psd: wrapParser(require('./common/psd_parser').Parser),
  svg: wrapParser(require('./common/svg_header_parser').Parser),
  tiff: wrapParser(require('./common/tiff_parser').Parser),
  webp: wrapParser(require('./common/webp_parser').Parser)
}
