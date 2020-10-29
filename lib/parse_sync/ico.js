'use strict';

/* eslint-disable consistent-return */

var readUInt16LE = require('../common').readUInt16LE;

var HEADER = 0;
var TYPE_ICO = 1;
var TYPE_CUR = 2;
var INDEX_SIZE = 16;

// Format specification:
// https://en.wikipedia.org/wiki/ICO_(file_format)#Icon_resource_structure
module.exports = function (data) {
  var header = readUInt16LE(data, 0);
  var type = readUInt16LE(data, 2);
  var numImages = readUInt16LE(data, 4);

  if (header !== HEADER || (type !== TYPE_ICO && type !== TYPE_CUR)) {
    return;
  }

  var maxSize = { width: 0, height: 0 };
  for (var i = 0; i < numImages; i++) {
    var width = data[6 + INDEX_SIZE * i] || 256;
    var height = data[6 + INDEX_SIZE * i + 1] || 256;

    if (width > maxSize.width || height > maxSize.height) {
      maxSize = { width: width, height: height };
    }
  }

  return {
    width: maxSize.width,
    height: maxSize.height,
    type: 'ico',
    mime: 'image/x-icon',
    wUnits: 'px',
    hUnits: 'px'
  };
};
