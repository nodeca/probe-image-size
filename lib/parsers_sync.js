'use strict'


function wrapParser (Parser) {
  return function (data) {
    var parser = new Parser()

    // Legacy support for plain arrays.
    if (Array.isArray(data)) data = new Uint8Array(data)

    parser.push(data)

    return parser.getResult()
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
