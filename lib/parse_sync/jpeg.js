'use strict'


var readUInt16BE = require('../common').readUInt16BE
var str2arr = require('../common').str2arr
var sliceEq = require('../common').sliceEq
var exifOrientation = require('../common/exif_orientation')


var SIG_EXIF = str2arr('Exif\0\0')


module.exports = function (data) {
  if (data.length < 2) return

  // first marker of the file MUST be 0xFFD8,
  // following by either 0xFFE0, 0xFFE2 or 0xFFE3
  if (data[0] !== 0xFF || data[1] !== 0xD8 || data[2] !== 0xFF) return

  var offset = 2

  for (;;) {
    // skip until we see 0xFF, see https://github.com/nodeca/probe-image-size/issues/68
    for (;;) {
      if (data.length - offset < 2) return
      if (data[offset++] === 0xFF) break
    }

    var code = data[offset++]
    var length

    // skip padding bytes
    while (code === 0xFF) code = data[offset++]

    // standalone markers, according to JPEG 1992,
    // http://www.w3.org/Graphics/JPEG/itu-t81.pdf, see Table B.1
    if ((code >= 0xD0 && code <= 0xD9) || code === 0x01) {
      length = 0
    } else if (code >= 0xC0 && code <= 0xFE) {
      // the rest of the unreserved markers
      if (data.length - offset < 2) return

      length = readUInt16BE(data, offset) - 2
      offset += 2
    } else {
      // unknown markers
      return
    }

    if (code === 0xD9 /* EOI */ || code === 0xDA /* SOS */) {
      // end of the datastream
      return
    }

    var orientation

    // try to get orientation from Exif segment
    if (code === 0xE1 && length >= 10 && sliceEq(data, offset, SIG_EXIF)) {
      var orientation_parser = new exifOrientation.Parser()
      orientation_parser.push((data.subarray || data.slice).call(data, offset + 6, offset + length))
      orientation = orientation_parser.orientation
    }

    if (length >= 5 &&
        (code >= 0xC0 && code <= 0xCF) &&
        code !== 0xC4 && code !== 0xC8 && code !== 0xCC) {
      if (data.length - offset < length) return

      var result = {
        width: readUInt16BE(data, offset + 3),
        height: readUInt16BE(data, offset + 1),
        type: 'jpg',
        mime: 'image/jpeg',
        wUnits: 'px',
        hUnits: 'px'
      }

      if (orientation > 0) {
        result.orientation = orientation
      }

      return result
    }

    offset += length
  }
}
