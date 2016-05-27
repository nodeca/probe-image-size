
'use strict';


var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var probe  = require('../');


describe('probeStream', function () {
  it('should process an image', function () {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    return probe(fs.createReadStream(file)).then(function (size) {
      assert.equal(size.width, 367);
      assert.equal(size.height, 187);
      assert.equal(size.mime, 'image/jpeg');
    });
  });

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


  it('should fail on stream errors', function (callback) {
    probe(require('from2')([ new Error('stream err') ]), function (err) {
      assert.equal(err.message, 'stream err');
      callback();
    });
  });
});
