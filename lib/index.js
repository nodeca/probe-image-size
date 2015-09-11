
'use strict';


var async   = require('async');
var request = require('request').defaults({ timeout: 5000, maxRedirects: 2 });
var once    = require('./common').once;


var parsers = {
  bmp:  require('./parsers/bmp'),
  gif:  require('./parsers/gif'),
  jpeg: require('./parsers/jpeg'),
  png:  require('./parsers/png'),
  psd:  require('./parsers/psd'),
  tiff: require('./parsers/tiff'),
  webp: require('./parsers/webp')
};


function probeStream(stream, callback) {
  // prevent "possible EventEmitter memory leak" warnings
  stream.setMaxListeners(Infinity);

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
      callback(new Error('unrecognized file format'));
      return;
    }

    callback(null, result);
  });
}


function probeHttp(options, _callback) {
  var callback = once(_callback);
  var req = request(options);

  req.on('response', function (res) {
    if (res.statusCode === 200) {
      probeStream(res, function (err, result) {
        req.abort();
        callback(err, result);
      });
    } else {
      var err = new Error('bad status code: ' + res.statusCode);

      err.status = res.statusCode;
      req.abort();
      callback(err);
    }
  });

  req.on('error', function (err) {
    callback(err);
  });
}


///////////////////////////////////////////////////////////////////////
// Exports
//
module.exports = function get_image_size(src, callback) {
  if (typeof src.on === 'function' && typeof src.emit === 'function') {
    // looks like an EventEmitter, treating it as a stream
    probeStream(src, callback);
  } else {
    probeHttp(src, callback);
  }
};

module.exports.parsers = parsers;
