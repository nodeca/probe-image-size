'use strict';

/* eslint-disable consistent-return */

var str2arr = require('../common').str2arr;
var sliceEq = require('../common').sliceEq;


var SIG_8BPS  = str2arr('8BPS\x00\x01');


module.exports = function (data) {
  // signature + version
  if (!sliceEq(data, 0, SIG_8BPS)) {
    return;
  }

  return {
    width:  data.readUInt32BE(6 + 12),
    height: data.readUInt32BE(6 + 8),
    type: 'psd',
    mime: 'image/vnd.adobe.photoshop'
  };
};
