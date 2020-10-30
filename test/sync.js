
'use strict';


var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var probe  = require('../');


describe('probeBuffer', function () {
  it('should skip unrecognized files', function () {
    var file = path.join(__dirname, 'fixtures', 'text_file.txt');
    var size = probe.sync(fs.readFileSync(file));

    assert.strictEqual(size, null);
  });


  it('should skip empty files', function () {
    var file = path.join(__dirname, 'fixtures', 'empty.txt');
    var size = probe.sync(fs.readFileSync(file));

    assert.strictEqual(size, null);
  });
});
