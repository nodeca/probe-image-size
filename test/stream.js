
'use strict';


var assert   = require('assert');
var fs       = require('fs');
var path     = require('path');
var probe    = require('../');
var Readable = require('readable-stream');


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


  // Regression test: when processing multiple consecutive large chunks in
  // a single request, probe used to throw "write after error" message.
  //
  // The way this test works is: SVG parser parses spaces up to 64k,
  // and WEBP parser closes immediately after first chunk. Check that it doesn't
  // error out.
  //
  it('should not fail when processing multiple large chunks', function (callback) {
    var stream = new Readable({
      read: function () {
        // > 16kB (so it will be split), < 64kB (SVG header size)
        var x = new Buffer(20000);
        x.fill(0x20);
        this.push(x);
      }
    });

    probe(stream, function (err) {
      assert.equal(err.message, 'unrecognized file format');

      callback();
    });
  });
});
