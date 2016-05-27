'use strict';


var ParserStream = require('../common').ParserStream;
var once         = require('../common').once;
var str2arr      = require('../common').str2arr;
var sliceEq      = require('../common').sliceEq;


var SIG_BM = str2arr('BM');


module.exports = function (input, _callback) {
  var callback = once(_callback);
  var parser = new ParserStream();

  parser._bytes(26, function (data) {
    parser._skipBytes(Infinity);

    if (!sliceEq(data, 0, SIG_BM)) {
      callback();
      return;
    }

    callback(null, {
      width:  data.readUInt16LE(18),
      height: data.readUInt16LE(22),
      type: 'bmp',
      mime: 'image/bmp'
    });
  });

  input.pipe(parser);

  return parser;
};
