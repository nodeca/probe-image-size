
'use strict';


var assert = require('assert');
var fs     = require('fs');
var path   = require('path');
var from2  = require('from2');
var probe  = require('../');


describe('File formats', function () {
  describe('BMP', function () {
    it('should detect BMP', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp' });

        callback();
      });
    });
  });


  describe('GIF', function () {
    it('should detect GIF', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif' });

        callback();
      });
    });
  });


  describe('JPEG', function () {
    it('should detect JPEG', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg' });

        callback();
      });
    });


    // regression test
    it('should not fail on empty JPEG markers', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'empty_comment.jpg');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg' });

        callback();
      });
    });


    it('should not fail on bad JPEG', function (callback) {
      // length of C0 is less than needed (should be 5+ bytes)
      var buf = new Buffer('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });
  });


  describe('PNG', function () {
    it('should detect PNG', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.png');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png' });

        callback();
      });
    });
  });


  describe('TIFF', function () {
    it('real image', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff' });

        callback();
      });
    });


    it('TIFF IFD is first in the file', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'meta_before_image.tiff');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff' });

        callback();
      });
    });


    it('bad TIFF IFD', function (callback) {
      // zero entries in 1st ifd, invalid TIFF
      //                     sig     off      count next
      var buf = new Buffer('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });


    it('bad TIFF IFD offset', function (callback) {
      // invalid 1st tiff offset
      //                     sig     off      count next
      var buf = new Buffer('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });


    it('bad TIFF IFD value', function (callback) {
      // invalid ifd type (FF instead of 03 or 04)
      //                     sig     off  count next
      var buf = new Buffer((
        '49492A00 08000000 0400' + // sig, off, count
        '0001 0000 01000000 2a000000' + // this should be ignored
        '0001 0400 01000000 2a000000' +
        '0001 0000 01000000 2a000000' + // this should be ignored
        '0101 0400 01000000 2a000000' +
        '00000000' // next
      ).replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 42, height: 42, type: 'tiff', mime: 'image/tiff' });

        callback();
      });
    });
  });


  describe('WEBP', function () {
    it('should detect VP8', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp' });

        callback();
      });
    });


    it('should detect VP8X', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8x.webp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp' });

        callback();
      });
    });


    it('should detect VP8L (lossless)', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8l.webp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp' });

        callback();
      });
    });
  });
});
