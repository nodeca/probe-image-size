'use strict';


var once    = require('./lib/common').once;
var error   = require('./lib/common').error;
var parsers = require('./lib/parsers_stream');


function unrecognizedFormat() {
  return error('unrecognized file format', 'ECONTENT');
}


module.exports = function probeStream(stream, _callback) {
  var callback = once(function () {
    // We should postpone callback to allow all piped parsers accept .write().
    // In other case, if stream is closed from callback that can cause
    // exceptions like "write after end".
    var args = Array.prototype.slice.call(arguments);

    process.nextTick(function () {
      _callback.apply(null, args);
    });
  });

  var pStreams = [];

  // prevent "possible EventEmitter memory leak" warnings
  stream.setMaxListeners(0);

  function cleanup(strm) {
    var i;

    if (strm) {
      stream.unpipe(strm);
      strm.end();
      i = pStreams.indexOf(strm);
      if (i >= 0) pStreams.splice(i, 1);
      return;
    }

    for (i = 0; i < pStreams.length; i++) {
      stream.unpipe(pStreams[i]);
      pStreams[i].end();
    }
    pStreams.length = 0;
  }

  stream.on('error', function (err) { cleanup(); callback(err); });

  Object.keys(parsers).forEach(function (type) {
    var pStream = parsers[type]();

    pStream.on('data', function (result) {
      callback(null, result);
      cleanup();
    });

    pStream.on('error', function () {
      // silently ignore errors because user does not need to know
      // that something wrong is happening here
    });

    pStream.on('end', function () {
      cleanup(pStream);

      if (pStreams.length === 0) {
        cleanup();
        callback(unrecognizedFormat());
      }
    });

    stream.pipe(pStream);

    pStreams.push(pStream);
  });
};


module.exports.parsers = parsers;
