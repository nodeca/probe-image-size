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

exports.str2arr = function (str, format) {
  var arr = [], i = 0;

  if (format && format === 'hex') {
    while (i < str.length) {
      arr.push(parseInt(str.slice(i, i + 2), 16));
      i += 2;
    }
  } else {
    for (; i < str.length; i++) {
      /* eslint-disable no-bitwise */
      arr.push(str.charCodeAt(i) & 0xFF);
    }
  }

  return arr;
};

exports.readUInt16LE = function (data, offset) {
  return data[offset] | (data[offset + 1] << 8);
};

exports.readUInt16BE = function (data, offset) {
  return data[offset + 1] | (data[offset] << 8);
};

exports.readUInt32LE = function (data, offset) {
  return data[offset] |
    (data[offset + 1] << 8) |
    (data[offset + 2] << 16) |
    (data[offset + 3] * 0x1000000);
};

exports.readUInt32BE = function (data, offset) {
  return data[offset + 3] |
    (data[offset + 2] << 8) |
    (data[offset + 1] << 16) |
    (data[offset] * 0x1000000);
};

exports.error = function (message, code, status) {
  var err = new Error(message);

  if (code) err.code = code;
  if (status) err.status = status;

  return err;
};
