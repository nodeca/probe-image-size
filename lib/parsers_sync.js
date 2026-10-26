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
