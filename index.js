'use strict';


var probeStream = require('./stream');
var probeHttp   = require('./http');


// Cache for promise implementation
var P;


/* eslint-disable consistent-return */

module.exports = function get_image_size(src, callback) {
  var prober;

  if (typeof src.on === 'function' && typeof src.emit === 'function') {
    // looks like an EventEmitter, treating it as a stream
    prober = probeStream;
  } else {
    prober = probeHttp;
  }

  if (!callback) {
    P = P || require('any-promise');

    return new P(function (resolve, reject) {
      prober(src, function (err, data) {
        if (err) reject(err);
        else resolve(data);
      });
    });
  }

  prober(src, callback);
};

module.exports.parsers = require('./lib/parsers_stream');
module.exports.sync    = require('./sync');
