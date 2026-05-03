'use strict';


var str2arr = require('../common').str2arr;
var sliceEq = require('../common').sliceEq;
var readInt16LE = require('../common').readInt16LE;
var readInt32LE = require('../common').readInt32LE;
var readUInt32LE = require('../common').readUInt32LE;

var SIG_BM = str2arr('BM');


module.exports = function (data) {
  if (data.length < 26) return;

  if (!sliceEq(data, 0, SIG_BM)) return;

  var h;
  var w;
  var headerSize = readUInt32LE(data, 14);

  if (headerSize === 12) {
    // BMP v2 header
    w = readInt16LE(data, 18);
    h = readInt16LE(data, 20);
  } else if (headerSize > 12) {
    // BMP v3+ header
    w = readInt32LE(data, 18);
    h = readInt32LE(data, 22);
  } else {
    // BPM v1 and other garbage (10 bytes usually)
    return;
  }

  return {
    width: w,
    // Height can be negative to indicate a top-down bitmap
    height: Math.abs(h),
    type: 'bmp',
    mime: 'image/bmp',
    wUnits: 'px',
    hUnits: 'px'
  };
};
