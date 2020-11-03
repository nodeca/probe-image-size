
'use strict';


const assert = require('assert');
const fs     = require('fs');
const path   = require('path');
const probe  = require('../');


describe('probeBuffer', function () {
  it('should skip unrecognized files', function () {
    let file = path.join(__dirname, 'fixtures', 'text_file.txt');
    let size = probe.sync(fs.readFileSync(file));

    assert.strictEqual(size, null);
  });


  it('should skip empty files', function () {
    let file = path.join(__dirname, 'fixtures', 'empty.txt');
    let size = probe.sync(fs.readFileSync(file));

    assert.strictEqual(size, null);
  });
});
