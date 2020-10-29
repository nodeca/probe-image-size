
'use strict';


var assert   = require('assert');
var fs       = require('fs');
var path     = require('path');
var probe    = require('../');
var Readable = require('stream').Readable;


function createBuffer(src, opts) {
  if (typeof src === 'number') {
    return Buffer.alloc ? Buffer.alloc(src, opts) : new Buffer(src, opts);
  }
  return Buffer.from ? Buffer.from(src, opts) : new Buffer(src, opts);
}


describe('probeStream', function () {
  it('should process an image (promise)', function () {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    return probe(fs.createReadStream(file)).then(function (size) {
      assert.equal(size.width, 367);
      assert.equal(size.height, 187);
      assert.equal(size.mime, 'image/jpeg');
    });
  });

  it('should process an image (callback)', function (done) {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.equal(size.width, 367);
      assert.equal(size.height, 187);
      assert.equal(size.mime, 'image/jpeg');
      done();
    });
  });

  it('should skip unrecognized files (promise)', function () {
    var file = path.join(__dirname, 'fixtures', 'text_file.txt');

    return probe(fs.createReadStream(file))
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.equal(err.message, 'unrecognized file format'));
  });

  it('should skip unrecognized files (callback)', function (done) {
    var file = path.join(__dirname, 'fixtures', 'text_file.txt');

    probe(fs.createReadStream(file), function (err) {
      assert.equal(err.message, 'unrecognized file format');
      done();
    });
  });

  it('should skip empty files', function () {
    var file = path.join(__dirname, 'fixtures', 'empty.txt');

    return probe(fs.createReadStream(file))
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.equal(err.message, 'unrecognized file format'));
  });

  it('should fail on stream errors', function () {
    return probe(require('from2')([ new Error('stream err') ]))
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.equal(err.message, 'stream err'));
  });


  // Regression test: when processing multiple consecutive large chunks in
  // a single request, probe used to throw "write after error" message.
  //
  // The way this test works is: SVG parser parses spaces up to 64k,
  // and WEBP parser closes immediately after first chunk. Check that it doesn't
  // error out.
  //
  it.skip('should not fail when processing multiple large chunks', function () {
    var stream = new Readable({
      read: function () {
        // > 16kB (so it will be split), < 64kB (SVG header size)
        var x = createBuffer(20000);
        x.fill(0x20);
        this.push(x);
      }
    });

    return probe(stream)
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.equal(err.message, 'unrecognized file format'));
  });
});
