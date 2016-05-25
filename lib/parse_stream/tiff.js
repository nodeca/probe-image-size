'use strict';


var ParserStream = require('../common').ParserStream;
var once         = require('../common').once;
var str2arr      = require('../common').str2arr;
var sliceEq      = require('../common').sliceEq;


var SIG_1 = str2arr('II\x2A\0');
var SIG_2 = str2arr('MM\0\x2A');


function readUInt16(buffer, offset, is_big_endian) {
  return is_big_endian ?
         buffer.readUInt16BE(offset) :
         buffer.readUInt16LE(offset);
}

function readUInt32(buffer, offset, is_big_endian) {
  return is_big_endian ?
         buffer.readUInt32BE(offset) :
         buffer.readUInt32LE(offset);
}

function readIFDValue(data, data_offset, is_big_endian) {
  var type       = readUInt16(data, data_offset + 2, is_big_endian);
  var values     = readUInt16(data, data_offset + 4, is_big_endian);

  if (values !== 1 && (type !== 3 && type !== 4)) {
    return null;
  }

  return type === 3 ?
         readUInt16(data, data_offset + 8, is_big_endian) :
         readUInt32(data, data_offset + 8, is_big_endian);
}

module.exports = function (input, _callback) {
  var callback = once(_callback);
  var parser = new ParserStream();

  parser.on('unpipe', function () {
    callback();
    return;
  });

  // read header
  parser._bytes(8, function (data) {
    // check TIFF signature
    var sig = data; // signature is 4 bytes only, we keep all 8 to avoid unneeded ops

    if (!sliceEq(sig, 0, SIG_1) && !sliceEq(sig, 0, SIG_2)) {
      parser._skipBytes(Infinity);
      callback();
      return;
    }

    var is_big_endian = (data[0] === 77 /* 'MM' */);
    var count = readUInt32(data, 4, is_big_endian) - 8;

    if (count < 0) {
      parser._skipBytes(Infinity);
      callback();
      return;
    }

    function safeSkip(parser, count, callback) {
      if (count === 0) { // parser._skipBytes throws error if count === 0
        callback();
        return;
      }

      parser._skipBytes(count, callback);
    }

    // skip until IFD
    safeSkip(parser, count, function () {
      // read number of IFD entries
      parser._bytes(2, function (data) {
        var count = readUInt16(data, 0, is_big_endian) * 12;

        if (count <= 0) {
          parser._skipBytes(Infinity);
          callback();
          return;
        }

        // read all IFD entries
        parser._bytes(count, function (data) {
          parser._skipBytes(Infinity);

          var i, width, height, tag;

          for (i = 0; i < data.length; i += 12) {
            tag = readUInt16(data, i, is_big_endian);

            if (tag === 256) {
              width = readIFDValue(data, i, is_big_endian);
            } else if (tag === 257) {
              height = readIFDValue(data, i, is_big_endian);
            }
          }

          if (width && height) {
            callback(null, {
              width:  width,
              height: height,
              type:   'tiff',
              mime:   'image/tiff'
            });
          }
        });
      });
    });
  });

  input.pipe(parser);
};
