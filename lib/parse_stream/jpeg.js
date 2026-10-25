'use strict'


var ParserStream = require('../common/utils').ParserStream
var str2arr = require('../common/utils').str2arr
var sliceEq = require('../common/utils').sliceEq
var exifOrientation = require('../common/exif_orientation_parser')


var SIG_EXIF = str2arr('Exif\0\0')
var EXIF_READ_SIZE = 4096


function parseExif (parser, length, sandbox) {
  var orientation_parser = new exifOrientation.Parser()
  var bytes_left = length

  function onExifChunk (data) {
    bytes_left -= data.length
    orientation_parser.push(data)

    if (orientation_parser.getStatus() === exifOrientation.NEED_MORE && bytes_left > 0) {
      parser._bytes(Math.min(bytes_left, EXIF_READ_SIZE), onExifChunk)
      return
    }

    sandbox.orientation = orientation_parser.orientation

    // The image dimensions follow APP1, so consume the rest of the segment.
    if (bytes_left > 0) {
      parser._skipBytes(bytes_left, function () {
        getJpegSize(parser, sandbox)
      })
    } else {
      getJpegSize(parser, sandbox)
    }
  }

  parser._bytes(Math.min(bytes_left, EXIF_READ_SIZE), onExifChunk)
}


// part of parseJpegMarker called after skipping initial FF
function parseJpegMarker_afterFF (parser, callback) {
  parser._bytes(1, function (data) {
    var code = data[0]

    if (code === 0xFF) {
      // padding byte, skip it
      parseJpegMarker_afterFF(parser, callback)
      return
    }

    // standalone markers, according to JPEG 1992,
    // http://www.w3.org/Graphics/JPEG/itu-t81.pdf, see Table B.1
    if ((code >= 0xD0 && code <= 0xD9) || code === 0x01) {
      callback(code, 0)
      return
    }

    // the rest of the unreserved markers
    if (code >= 0xC0 && code <= 0xFE) {
      parser._bytes(2, function (length) {
        callback(code, length.readUInt16BE(0) - 2)
      })
      return
    }

    // unknown markers
    callback()
  })
}


function parseJpegMarker (parser, sandbox, callback) {
  var start = sandbox.start
  sandbox.start = false

  parser._bytes(1, function (data) {
    if (data[0] !== 0xFF) {
      // not a JPEG marker
      if (start) {
        // expect JPEG file to start with `FFD8 FFE0`, `FFD8 FFE2` or `FFD8 FFE1`,
        // don't allow garbage before second marker
        callback()
      } else {
        // skip until we see 0xFF, see https://github.com/nodeca/probe-image-size/issues/68
        parseJpegMarker(parser, sandbox, callback)
      }
      return
    }

    parseJpegMarker_afterFF(parser, callback)
  })
}


// sandbox is a storage for intermediate data retrieved from jpeg while parsing it
function getJpegSize (parser, sandbox) {
  parseJpegMarker(parser, sandbox, function (code, length) {
    if (!code || length < 0) {
      // invalid jpeg
      parser._skipBytes(Infinity)
      parser.push(null)
      return
    }

    if (code === 0xD9 /* EOI */ || code === 0xDA /* SOS */) {
      // end of the datastream
      parser._skipBytes(Infinity)
      parser.push(null)
      return
    }

    // try to get orientation from Exif segment
    if (code === 0xE1 && length >= 10) {
      parser._bytes(6, function (data) {
        if (sliceEq(data, 0, SIG_EXIF)) {
          parseExif(parser, length - 6, sandbox)
        } else {
          parser._skipBytes(length - 6, function () {
            getJpegSize(parser, sandbox)
          })
        }
      })
      return
    }

    if (length <= 0) {
      // e.g. empty comment
      getJpegSize(parser, sandbox)
      return
    }

    if (length >= 5 &&
        (code >= 0xC0 && code <= 0xCF) &&
        code !== 0xC4 && code !== 0xC8 && code !== 0xCC) {
      parser._bytes(5, function (data) {
        parser._skipBytes(Infinity)

        var result = {
          width: data.readUInt16BE(3),
          height: data.readUInt16BE(1),
          type: 'jpg',
          mime: 'image/jpeg',
          wUnits: 'px',
          hUnits: 'px'
        }

        if (sandbox.orientation > 0) result.orientation = sandbox.orientation

        parser.push(result)
        parser.push(null)
      })
      return
    }

    parser._skipBytes(length, function () {
      getJpegSize(parser, sandbox)
    })
  })
}


module.exports = function () {
  var parser = new ParserStream()

  parser._bytes(2, function (data) {
    if (data[0] !== 0xFF || data[1] !== 0xD8) {
      // first marker of the file MUST be 0xFFD8
      parser._skipBytes(Infinity)
      parser.push(null)
      return
    }

    getJpegSize(parser, { start: true })
  })

  return parser
}
