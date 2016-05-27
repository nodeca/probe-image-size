'use strict';


var once    = require('./lib/common').once;
var error   = require('./lib/common').error;
var parsers = require('./lib/parsers_stream');


module.exports = function probeStream(stream, _callback) {
  var callback = once(_callback);

  // prevent "possible EventEmitter memory leak" warnings
  stream.setMaxListeners(0);

  stream.on('error', function (err) { callback(err); });

  var pending = 0;

  Object.keys(parsers).forEach(function (type) {
    var parser = parsers[type];

    pending++;

    parser(stream, function (__, result) {
      pending--;

      if (result) {
        callback(null, result);
        return;
      }

      // No more active scanners & still no positive -> fail
      if (!pending) {
        callback(error('unrecognized file format', 'ECONTENT'));
        return;
      }
    });
  });
};


module.exports.parsers = parsers;
