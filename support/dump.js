#!/usr/bin/node

'use strict';

/* eslint-disable no-console */


var files = process.argv.slice(2);

if (!files.length) {
  console.error('Usage: dump.js file1 [file2 [file3 ...]]');
  return;
}

files.forEach(function (file) {
  if (file.match(/^https?:\/\//)) {
    require('../')(file, function (err, result) {
      console.log(file + ':', err || result);
    });
  } else {
    var input = require('fs').createReadStream(file);

    input.on('error', function (err) {
      console.log(file + ':', err);
    });

    require('../')(input, function (err, result) {
      console.log(file + ':', err || result);
      input.destroy();
    });
  }
});
