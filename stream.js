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

  var pending  = 0;
  var pStreams = [];

  // prevent "possible EventEmitter memory leak" warnings
  stream.setMaxListeners(0);

  function cleanup(strm) {
    var i;

    if (strm) {
      i = pStreams.indexOf(strm);
      if (i) {
        stream.unpipe(pStreams[i]);
        pStreams[i].end();
        pStreams.splice(i, 1);
      }
      return;
    }

    for (i = 0; i < pStreams.length; i++) {
      stream.unpipe(pStreams[i]);
      pStreams[i].end();
    }
    pStreams.length = 0;
  }

  stream.on('error', function (err) { cleanup(); callback(err); });
  stream.on('end',   function ()    { cleanup(); callback(unrecognizedFormat()); });

  Object.keys(parsers).forEach(function (type) {

    pending++;

    var pStream = parsers[type](stream, function (__, result) {
      pending--;

      cleanup(pStream);

      if (result) {
        callback(null, result);
        return;
      }

      // No more active scanners & still no positive -> fail
      if (!pending) {
        cleanup();
        callback(unrecognizedFormat());
        return;
      }
    });

    pStreams.push(pStream);
  });
};


module.exports.parsers = parsers;
