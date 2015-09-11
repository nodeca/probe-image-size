
'use strict';


var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var probe  = require('../');


describe('probeStream', function () {
  // fixtures derived from https://github.com/nodejs/node/issues/37,
  // author: @substack
  // license: public domain/CC0
  it('should detect PNG', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.png');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png' });

      callback();
    });
  });


  it('should detect GIF', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif' });

      callback();
    });
  });


  it('should detect JPEG', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'jpeg', mime: 'image/jpeg' });

      callback();
    });
  });


  it('should detect TIFF', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff' });

      callback();
    });
  });


  it('should detect WEBP VPX', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'webp-lossy.webp');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp' });

      callback();
    });
  });


  it('should detect WEBP VPL', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'webp-lossless.webp');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp' });

      callback();
    });
  });


  it('should detect BMP', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');

    probe(fs.createReadStream(file), function (err, size) {
      assert.ifError(err);
      assert.deepEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp' });

      callback();
    });
  });


  it('should skip unrecognized files', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'text_file.txt');

    probe(fs.createReadStream(file), function (err, size) {
      assert.equal(err.message, 'unrecognized file format');

      callback();
    });
  });


  it('should skip empty files', function (callback) {
    var file = path.join(__dirname, 'fixtures', 'empty.txt');

    probe(fs.createReadStream(file), function (err, size) {
      assert.equal(err.message, 'unrecognized file format');

      callback();
    });
  });
});
