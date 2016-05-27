'use strict';


var ParserStream = require('../common').ParserStream;
var once         = require('../common').once;
var str2arr      = require('../common').str2arr;
var sliceEq      = require('../common').sliceEq;


var SIG_GIF87a = str2arr('GIF87a');
var SIG_GIF89a = str2arr('GIF89a');


module.exports = function (input, _callback) {
  var callback = once(_callback);
  var parser = new ParserStream();

  parser._bytes(10, function (data) {
    parser._skipBytes(Infinity);

    if (!sliceEq(data, 0, SIG_GIF87a) &&  !sliceEq(data, 0, SIG_GIF89a)) {
      callback();
      return;
    }

    callback(null, {
      width:  data.readUInt16LE(6),
      height: data.readUInt16LE(8),
      type: 'gif',
      mime: 'image/gif'
    });
  });

  input.pipe(parser);

  return parser;
};
