#!/usr/bin/node

'use strict';

/*eslint-env node, es6*/
/*eslint-disable no-console*/


const files = process.argv.slice(2);

if (!files.length) {
  console.error('Usage: dump.js file1 [file2 [file3 ...]]');
  return;
}

files.forEach(function (file) {

  if (file.match(/^https?:\/\//)) {
    require('../')(file)
      .then(result => console.log(`${file}: ${result}`))
      .catch(err => console.log(err));

  } else {
    let input = require('fs').createReadStream(file);

    input.on('error', err => console.log(`${file}: ${err}`));

    require('../')(input)
      .then(result => {
        console.log(`${file}: ${result}`);
        input.destroy();
      })
      .catch(err => {
        console.log(err);
        input.destroy();
      });
  }
});
