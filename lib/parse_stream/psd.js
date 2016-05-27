'use strict';


var ParserStream = require('../common').ParserStream;
var once         = require('../common').once;
var str2arr      = require('../common').str2arr;
var sliceEq      = require('../common').sliceEq;


var SIG_8BPS  = str2arr('8BPS\x00\x01');


module.exports = function (input, _callback) {
  var callback = once(_callback);
  var parser = new ParserStream();

  parser._bytes(6, function (data) {
    // signature + version
    if (!sliceEq(data, 0, SIG_8BPS)) {
      parser._skipBytes(Infinity);
      callback();
      return;
    }

    parser._bytes(16, function (data) {
      parser._skipBytes(Infinity);
      callback(null, {
        width:  data.readUInt32BE(12),
        height: data.readUInt32BE(8),
        type: 'psd',
        mime: 'image/vnd.adobe.photoshop'
      });
    });
  });

  input.pipe(parser);

  return parser;
};
