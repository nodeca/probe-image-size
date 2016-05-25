'use strict';


var Transform    = require('readable-stream').Transform;
var streamParser = require('stream-parser');
var inherits     = require('util').inherits;


function ParserStream() {
  Transform.call(this);
}

inherits(ParserStream, Transform);
streamParser(ParserStream.prototype);


exports.ParserStream = ParserStream;

exports.once = function (fn) {
  var called = false;

  return function () {
    if (!called) {
      called = true;
      fn.apply(this, arguments);
    }
  };
};

exports.sliceEq = function (src, start, dest) {
  for (var i = start, j = 0; j < dest.length;) {
    if (src[i++] !== dest[j++]) return false;
  }
  return true;
};

exports.str2arr = function (str) {
  var arr = new Array(str.length);

  for (var i = 0; i < arr.length; i++) {
    /* eslint-disable no-bitwise */
    arr[i] = str.charCodeAt(i) & 0xFF;
  }

  return arr;
};
