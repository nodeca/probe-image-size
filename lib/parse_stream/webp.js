'use strict';

/* eslint-disable no-bitwise */

var ParserStream = require('../common').ParserStream;
var once         = require('../common').once;
var str2arr      = require('../common').str2arr;
var sliceEq      = require('../common').sliceEq;


var SIG_RIFF    = str2arr('RIFF');
var SIG_WEBPVP8 = str2arr('WEBPVP8');


function parseVP8(parser, callback) {
  parser._bytes(14, function (data) {
    parser._skipBytes(Infinity);

    if (data[7] !== 0x9D || data[8] !== 0x01 || data[9] !== 0x2A) {
      // bad code block signature
      callback();
      return;
    }

    callback(null, {
      width:  data.readUInt16LE(10) & 0x3FFF,
      height: data.readUInt16LE(12) & 0x3FFF,
      type:   'webp',
      mime:   'image/webp'
    });
  });
}


function parseVP8L(parser, callback) {
  parser._bytes(9, function (data) {
    parser._skipBytes(Infinity);

    if (data[4] !== 0x2F) {
      // bad code block signature
      callback();
      return;
    }

    var bits = data.readUInt32LE(5);

    callback(null, {
      width:  (bits & 0x3FFF) + 1,
      height: ((bits >> 14) & 0x3FFF) + 1,
      type:   'webp',
      mime:   'image/webp'
    });
  });
}


function parseVP8X(parser, callback) {
  parser._bytes(14, function (data) {
    parser._skipBytes(Infinity);

    callback(null, {
      // TODO: replace with `data.readUIntLE(8, 3) + 1`
      //       when 0.10 support is dropped
      width:  ((data[10] << 16) | (data[9] << 8) | data[8]) + 1,
      height: ((data[13] << 16) | (data[12] << 8) | data[11]) + 1,
      type:   'webp',
      mime:   'image/webp'
    });
  });
}


module.exports = function (input, _callback) {
  var callback = once(_callback);
  var parser = new ParserStream();

  parser._bytes(16, function (data) {

    // check /^RIFF....WEBPVP8([ LX])$/ signature

    if (sliceEq(data, 0, SIG_RIFF) && sliceEq(data, 8, SIG_WEBPVP8)) {
      switch (data[15]) {
        case 32/*' '*/: parseVP8(parser, callback); return;
        case 76/* L */: parseVP8L(parser, callback); return;
        case 88/* X */: parseVP8X(parser, callback); return;
      }
    }

    parser._skipBytes(Infinity);
    callback();
    return;
  });

  input.pipe(parser);

  return parser;
};
