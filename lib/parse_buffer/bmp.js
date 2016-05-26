'use strict';

/* eslint-disable consistent-return */

var str2arr = require('../common').str2arr;
var sliceEq = require('../common').sliceEq;


var SIG_BM = str2arr('BM');


module.exports = function (data) {
  if (!sliceEq(data, 0, SIG_BM)) {
    return;
  }

  return {
    width:  data.readUInt16LE(18),
    height: data.readUInt16LE(22),
    type: 'bmp',
    mime: 'image/bmp'
  };
};
