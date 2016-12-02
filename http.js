'use strict';


var ProbeError  = require('./lib/common').ProbeError;
var got         = require('got');
var merge       = require('deepmerge');
var pkg         = require('./package.json');
var probeStream = require('./stream');

var defaultAgent = pkg.name + '/' + pkg.version + '(+https://github.com/nodeca/probe-image-size)';

var defaults = {
  timeout: 30000,
  retries: 1,
  headers: {
    'User-Agent': defaultAgent
  }
};

var P;


module.exports = function probeHttp(src, options) {
  // lazy Promise init
  P = P || require('any-promise');

  return new P(function (resolve, reject) {
    var request, length, finalUrl;

    var stream = got.stream(src, merge.all([ {}, defaults, options ], { clone: true }));

    stream.on('request',  function (req) {
      request = req;
    });
    stream.on('response', function (res) {
      if (res.statusCode === 200) {
        var len = res.headers['content-length'];

        if (len && len.match(/^\d+$/)) length = +len;
        finalUrl = res.url;

        return;
      }

      reject(new ProbeError('bad status code: ' + res.statusCode, null, res.statusCode));
    });

    stream.on('error', function (err) {
      if (err.statusCode) {
        reject(new ProbeError('bad status code: ' + err.statusCode, null, err.statusCode));
        return;
      }
      reject(err);
    });

    probeStream(stream)
      .then(function (result) {
        if (length) result.length = length;

        result.url = finalUrl;

        resolve(result);
      })
      .catch(reject)
      .then(function () {
        /* istanbul ignore else */
        if (request) request.abort();
      });
  });
};


module.exports.parsers = require('./lib/parsers_stream');
