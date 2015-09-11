'use strict';


var ParserStream = require('../common').ParserStream;
var once         = require('../common').once;


module.exports = function (input, _callback) {
  var callback = once(_callback);
  var parser = new ParserStream();

  parser.on('unpipe', function () {
    callback();
    return;
  });

  parser._bytes(26, function (data) {
    parser._skipBytes(Infinity);

    if (data.toString('binary', 0, 2) !== 'BM') {
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
};
