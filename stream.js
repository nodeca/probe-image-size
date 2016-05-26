'use strict';


var async   = require('async');
var parsers = require('./lib/parsers_stream');


module.exports = function probeStream(stream, callback) {
  // prevent "possible EventEmitter memory leak" warnings
  stream.setMaxListeners(0);

  async.map(parsers, function (parser, next) {
    parser(stream, next);
  }, function (err, results) {
    if (err) {
      callback(err);
      return;
    }

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
