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

  parser._bytes(6, function (data) {
    // signature + version
    if (data.toString('binary') !== '8BPS\x00\x01') {
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
};
