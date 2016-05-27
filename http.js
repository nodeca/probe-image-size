'use strict';


var once        = require('./lib/common').once;
var request     = require('request').defaults({
  timeout: 30000,
  maxRedirects: 2,
  rejectUnauthorized: false
});

var probeStream = require('./stream');


module.exports = function probeHttp(options, _callback) {
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

          if (length && length.match(/^\d+$/)) {
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

  req.on('error', function (err) { callback(err); });
};


module.exports.parsers = require('./lib/parsers_stream');
