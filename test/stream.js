
'use strict';


var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var probe  = require('../');


describe('probeStream', function () {
  it('should skip unrecognized files', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'text_file.txt');

    probe(fs.createReadStream(file), function (err) {
      assert.equal(err.message, 'unrecognized file format');

      callback();
    });
  });


  it('should skip empty files', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'empty.txt');

    probe(fs.createReadStream(file), function (err) {
      assert.equal(err.message, 'unrecognized file format');

      callback();
    });
  });
});
