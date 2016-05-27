'use strict';


var once    = require('./lib/common').once;
var async   = require('async');
var parsers = require('./lib/parsers_stream');


module.exports = function probeStream(stream, _callback) {
  var callback = once(_callback);

  // prevent "possible EventEmitter memory leak" warnings
  stream.setMaxListeners(0);

  stream.on('error', function (err) { callback(err); });

  async.map(parsers, function (parser, next) {
    parser(stream, next);
  }, function (__, results) {
    // parsers never return error (just fail silently), no need to check

    var result = Object.keys(results).map(function (type) {
      return results[type];
    }).filter(Boolean)[0];

    if (!result) {
      var error = new Error('unrecognized file format');

      error.code = 'ECONTENT';
      callback(error);
      return;
    }

    callback(null, result);
  });
};


module.exports.parsers = parsers;
