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

  parser._bytes(24, function (data) {
    parser._skipBytes(Infinity);

    // check PNG signature
    if (data.toString('binary', 0, 8) !== '\x89PNG\r\n\x1a\n') {
      callback();
      return;
    }

    // check that first chunk is IHDR
    if (data.toString('binary', 12, 16) !== 'IHDR') {
      callback();
      return;
    }

    callback(null, {
      width:  data.readUInt32BE(16),
      height: data.readUInt32BE(20),
      type: 'png',
      mime: 'image/png'
    });
  });

  input.pipe(parser);
};
