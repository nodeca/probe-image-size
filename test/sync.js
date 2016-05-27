
'use strict';


var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var probe  = require('../');


function toArray(buf) {
  var arr = new Array(buf.length);

  for (var i = 0; i < buf.length; i++) {
    arr[i] = buf[i];
  }

  return arr;
}


describe('probeBuffer', function () {
  it('should skip unrecognized files', function () {
    var file = path.join(__dirname, 'fixtures', 'text_file.txt');
    var size = probe.sync(toArray(fs.readFileSync(file)));

    assert.equal(size, null);
  });


  it('should skip empty files', function () {
    var file = path.join(__dirname, 'fixtures', 'empty.txt');
    var size = probe.sync(toArray(fs.readFileSync(file)));

    assert.equal(size, null);
  });
});
