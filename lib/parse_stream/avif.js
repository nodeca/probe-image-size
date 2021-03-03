// Utils used to parse miaf-based files (avif/heic/heif)
//
//  - image collections are not supported (only last size is reported)
//  - images with metadata encoded after image data are not supported
//  - images without any `ispe` box are not supported
//

'use strict';

/* eslint-disable consistent-return */


var ParserStream = require('../common').ParserStream;
var str2arr      = require('../common').str2arr;
var sliceEq      = require('../common').sliceEq;
var readUInt32BE = require('../common').readUInt32BE;
var miaf         = require('../miaf_utils');

var SIG_FTYP = str2arr('ftyp');


function safeSkip(parser, count, callback) {
  if (count === 0) { // parser._skipBytes throws error if count === 0
    callback();
    return;
  }

  parser._skipBytes(count, callback);
}


function readAvifSize(parser, fileType) {
  parser._bytes(8, function (data) {
    var size = readUInt32BE(data, 0) - 8;
    var type = String.fromCharCode.apply(null, data.slice(4, 8));

    if (type === 'mdat') {
      parser._skipBytes(Infinity);
      parser.push(null);
      return;
    } else if (size < 0) {
      parser._skipBytes(Infinity);
      parser.push(null);
      return;
    } else if (type === 'meta' && size > 0) {
      parser._bytes(size, function (data) {
        parser._skipBytes(Infinity);

        var imgSize = miaf.readSizeFromMeta(data);

        if (!imgSize) return;

        var result = {
          width:    imgSize.width,
          height:   imgSize.height,
          type:     fileType.type,
          mime:     fileType.mime,
          wUnits:   'px',
          hUnits:   'px'
        };

        if (imgSize.variants.length > 1) {
          result.variants = imgSize.variants;
        }

        if (imgSize.orientation) {
          result.orientation = imgSize.orientation;
        }

        parser.push(result);
        parser.push(null);
      });
    } else {
      safeSkip(parser, size, function () {
        readAvifSize(parser, fileType);
      });
    }
  });
}


module.exports = function () {
  var parser = new ParserStream();

  parser._bytes(8, function (data) {
    if (!sliceEq(data, 4, SIG_FTYP)) {
      parser._skipBytes(Infinity);
      parser.push(null);
      return;
    }

    var size = readUInt32BE(data, 0) - 8;

    if (size <= 0) {
      parser._skipBytes(Infinity);
      parser.push(null);
      return;
    }

    parser._bytes(size, function (data) {
      var fileType = miaf.getMimeType(data);

      if (!fileType) {
        parser._skipBytes(Infinity);
        parser.push(null);
        return;
      }

      readAvifSize(parser, fileType);
    });
  });

  return parser;
};
