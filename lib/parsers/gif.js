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

  parser._bytes(10, function (data) {
    parser._skipBytes(Infinity);

    // check GIF signature
    var sig = data.toString('binary', 0, 6);

    if (sig !== 'GIF87a' && sig !== 'GIF89a') {
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
};
