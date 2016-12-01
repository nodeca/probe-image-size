'use strict';


var error       = require('./lib/common').error;
var parsers     = require('./lib/parsers_stream');
var PassThrough = require('stream').PassThrough;


function unrecognizedFormat() {
  return error('unrecognized file format', 'ECONTENT');
}

var P;


module.exports = function probeStream(stream) {
  // lazy Promise init
  P = P || require('any-promise');

  var proxy = new PassThrough();
  var cnt = 0; // count of working parsers

  var result = new P(function (resolve, reject) {
    stream.on('error', reject);
    proxy.on('error', reject);

    function nope() {}

    function parserEnd() {
      proxy.unpipe(this);
      this.removeAllListeners();
      cnt--;
      // if all parsers finished without success -> fail.
      if (!cnt) reject(unrecognizedFormat());
    }

    Object.keys(parsers).forEach(function (type) {
      var pStream = parsers[type]();

      cnt++;

      pStream.once('data', resolve);
      pStream.once('end', parserEnd);
      // silently ignore errors because user does not need to know
      // that something wrong is happening here
      pStream.on('error', nope);

      proxy.pipe(pStream);
    });
  });

  function cleanup() {
    stream.unpipe(proxy);
    proxy.end();
  }

  result.then(cleanup).catch(cleanup);

  stream.pipe(proxy);

  return result;
};


module.exports.parsers = parsers;
