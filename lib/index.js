
'use strict';


var async   = require('async');
var request = require('request').defaults({ timeout: 30000, maxRedirects: 2, rejectUnauthorized: false });
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
}


function probeHttp(options, _callback) {
  var callback = once(_callback);
  var req;

  try {
    req = request(options);
  } catch (err) {
    callback(err);
    return;
  }

  req.on('response', function (res) {
    if (res.statusCode === 200) {
      probeStream(res, function (err, result) {
        req.abort();

        if (result) {
          var length = res.headers['content-length'];

          /* eslint-disable eqeqeq */
          if (length == +length) {
            result.length = +length;
          }
        }

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
