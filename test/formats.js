
'use strict';


var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');
var from2   = require('from2');
var probe   = require('../');
var str2arr = require('../lib/common').str2arr;


function toArray(buf) {
  var arr = new Array(buf.length);

  for (var i = 0; i < buf.length; i++) {
    arr[i] = buf[i];
  }

  return arr;
}


/* eslint-disable max-len */
describe('File formats', function () {
  describe('BMP', function () {
    it('should detect BMP', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });
  });


  describe('BMP (sync)', function () {
    it('should detect BMP', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('GIF', function () {
    it('should detect GIF', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });
  });


  describe('GIF (sync)', function () {
    it('should detect GIF', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('JPEG', function () {
    it('should detect JPEG', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    // regression test
    it('should not fail on empty JPEG markers', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'empty_comment.jpg');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });

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


    it('coverage - EOI before SOI', function (callback) {
      var buf = new Buffer('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });


    it('coverage - unknown marker', function (callback) {
      var buf = new Buffer('FFD8 FF05'.replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });
  });


  describe('JPEG (sync)', function () {
    it('should detect JPEG', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('should not fail on empty JPEG markers', function () {
      var file = path.join(__dirname, 'fixtures', 'empty_comment.jpg');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('should not fail on bad JPEG', function () {
      // length of C0 is less than needed (should be 5+ bytes)
      var buf = str2arr('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex');
      var size = probe.sync(buf);

      assert.equal(size, null);
    });


    it('coverage - EOI before SOI', function () {
      var buf = str2arr('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex');

      assert.equal(probe.sync(buf), null);
    });


    it('coverage - unknown marker', function () {
      var buf = str2arr('FFD8 FF05'.replace(/ /g, ''), 'hex');

      assert.equal(probe.sync(buf), null);
    });


    it('coverage - truncated JPEG', function () {
      var buf;

      buf = str2arr('FFD8 FF'.replace(/ /g, ''), 'hex');
      assert.equal(probe.sync(buf), null);

      buf = str2arr('FFD8 FFC0 00'.replace(/ /g, ''), 'hex');
      assert.equal(probe.sync(buf), null);

      buf = str2arr('FFD8 FFC0 FFFF 00'.replace(/ /g, ''), 'hex');
      assert.equal(probe.sync(buf), null);
    });
  });


  describe('PNG', function () {
    it('should detect PNG', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.png');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    it('should skip PNG start pattern without IHDR', function (callback) {
      var buf = new Buffer(str2arr('\x89PNG\r\n\x1a\n                  '));

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });
  });


  describe('PNG (sync)', function () {
    it('should detect PNG', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.png');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip PNG start pattern without IHDR', function () {
      var size = probe.sync(str2arr('\x89PNG\r\n\x1a\n                  '));

      assert.equal(size, null);
    });
  });


  describe('PSD', function () {
    it('should detect PSD', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'empty.psd');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });
  });


  describe('PSD (sync)', function () {
    it('should detect PSD', function () {
      var file = path.join(__dirname, 'fixtures', 'empty.psd');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('SVG', function () {
    it('should detect SVG', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'sample.svg');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });

    it('should work with weirdly split chunks', function (callback) {
      probe(from2([
        new Buffer('   '),
        new Buffer(' <s'),
        new Buffer('vg width="5" height="5"></svg>')
      ]), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 5, height: 5, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });

    it('should extract width info from viewbox', function (callback) {
      probe(from2([
        new Buffer('<svg viewbox="0 0 800 600"></svg>')
      ]), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });

    it('should return width/height units', function (callback) {
      probe(from2([
        new Buffer('<svg width="5in" height="4pt"></svg>')
      ]), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });

        callback();
      });
    });

    /* eslint-disable max-nested-callbacks */
    describe('coverage', function () {
      it('too much data before doctype', function (callback) {
        var buf = new Buffer(70000);

        buf.fill(0x20);

        probe(from2([ buf ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });

      it('too much data before svg', function (callback) {
        var buf = new Buffer(70000);

        buf.fill(0x20);

        probe(from2([ new Buffer('<svg'), buf ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });

      it('width, no height', function (callback) {
        probe(from2([ new Buffer('<svg width="1in" viewbox="0 0 100 50">') ]), function (err, size) {
          assert.ifError(err);
          assert.deepEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });

          callback();
        });
      });

      it('height, no width', function (callback) {
        probe(from2([ new Buffer('<svg height="1in" viewbox="0 0 100 50">') ]), function (err, size) {
          assert.ifError(err);
          assert.deepEqual(size, { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });

          callback();
        });
      });

      it('width is invalid, no height', function (callback) {
        probe(from2([ new Buffer('<svg width="-1" viewbox="0 0 100 50">') ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });

      it('height is invalid, no width', function (callback) {
        probe(from2([ new Buffer('<svg height="foobar" viewbox="0 0 100 50">') ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });

      it('width is invalid', function (callback) {
        probe(from2([ new Buffer('<svg width="0" height="5">') ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });

      it('no viewbox, no height', function (callback) {
        probe(from2([ new Buffer('<svg width="5">') ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });

      it('viewbox units are different', function (callback) {
        probe(from2([ new Buffer('<svg width="5" viewbox="0 0 5px 3in">') ]), function (err) {
          assert.equal(err.message, 'unrecognized file format');

          callback();
        });
      });
    });
  });


  describe('SVG (sync)', function () {
    it('should detect PNG', function () {
      var file = path.join(__dirname, 'fixtures', 'sample.svg');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from viewbox', function () {
      var size = probe.sync(toArray(new Buffer('<svg viewbox="0 0 800 600"></svg>')));

      assert.deepEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should return width/height units', function () {
      var size = probe.sync(toArray(new Buffer('<svg width="5in" height="4pt"></svg>')));

      assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
    });

    describe('coverage', function () {
      it('wrong signature', function () {
        var size = probe.sync(toArray(new Buffer('  <not-really-svg width="1" height="1">')));

        assert.equal(size, null);
      });

      it('width, no height', function () {
        var size = probe.sync(toArray(new Buffer('<svg width="1in" viewbox="0 0 100 50">')));

        assert.deepEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('height, no width', function () {
        var size = probe.sync(toArray(new Buffer('<svg height="1in" viewbox="0 0 100 50">')));

        assert.deepEqual(size, { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('width is invalid, no height', function () {
        var size = probe.sync(toArray(new Buffer('<svg width="-1" viewbox="0 0 100 50">')));

        assert.deepEqual(size, null);
      });

      it('height is invalid, no width', function () {
        var size = probe.sync(toArray(new Buffer('<svg height="foobar" viewbox="0 0 100 50">')));

        assert.deepEqual(size, null);
      });

      it('width is invalid', function () {
        var size = probe.sync(toArray(new Buffer('<svg width="0" height="5">')));

        assert.deepEqual(size, null);
      });

      it('no viewbox, no height', function () {
        var size = probe.sync(toArray(new Buffer('<svg width="5">')));

        assert.deepEqual(size, null);
      });

      it('viewbox units are different', function () {
        var size = probe.sync(toArray(new Buffer('<svg width="5" viewbox="0 0 5px 3in">')));

        assert.deepEqual(size, null);
      });
    });
  });


  describe('TIFF', function () {
    it('real image', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    it('real image, Big Endian', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo_be.tiff');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    it('TIFF IFD is first in the file', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'meta_before_image.tiff');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });

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
        '49492A00 08000000 0200' + // sig, off, count
        '0001 0000 01000000 FF000000' +
        '0101 0400 01000000 2A000000' +
        '00000000' // next
      ).replace(/ /g, ''), 'hex');

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });
  });


  describe('TIFF (sync)', function () {
    it('real image', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('real image, Big Endian', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo_be.tiff');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('TIFF IFD is first in the file', function () {
      var file = path.join(__dirname, 'fixtures', 'meta_before_image.tiff');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('bad TIFF IFD', function () {
      // zero entries in 1st ifd, invalid TIFF
      //                     sig     off      count next
      var buf = str2arr('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex');

      assert.equal(probe.sync(buf), null);
    });


    it('bad TIFF IFD offset', function () {
      // invalid 1st tiff offset
      //                     sig     off      count next
      var buf = str2arr('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex');

      assert.equal(probe.sync(buf), null);
    });


    it('bad TIFF IFD value', function () {
      // invalid ifd type (FF instead of 03 or 04)
      //                     sig     off  count next
      var buf = str2arr((
        '49492A00 08000000 0200' + // sig, off, count
        '0001 0000 01000000 FF000000' +
        '0101 0400 01000000 2A000000' +
        '00000000' // next
      ).replace(/ /g, ''), 'hex');

      assert.equal(probe.sync(buf), null);
    });


    it('coverage - truncated TIFF', function () {
      var buf;

      buf = str2arr('49492A00 08000000 02'.replace(/ /g, ''), 'hex');
      assert.equal(probe.sync(buf), null);

      buf = str2arr('49492A00 08000000 0200 00'.replace(/ /g, ''), 'hex');
      assert.equal(probe.sync(buf), null);
    });
  });


  describe('WEBP', function () {
    it('should detect VP8', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    it('should skip VP8 header with bad code block', function (callback) {
      var buf = new Buffer(str2arr('RIFF....WEBPVP8 ........................'));

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });


    it('should detect VP8X', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8x.webp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    it('should detect VP8L (lossless)', function (callback) {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8l.webp');

      probe(fs.createReadStream(file), function (err, size) {
        assert.ifError(err);
        assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });

        callback();
      });
    });


    it('should skip VP8L header with bad code block', function (callback) {
      var buf = new Buffer(str2arr('RIFF....WEBPVP8L........................'));

      probe(from2([ buf ]), function (err) {
        assert.equal(err.message, 'unrecognized file format');

        callback();
      });
    });
  });


  describe('WEBP (sync)', function () {
    it('should detect VP8', function () {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8 header with bad code block', function () {
      var size = probe.sync(str2arr('RIFF....WEBPVP8 ........................'));

      assert.equal(size, null);
    });


    it('should detect VP8X', function () {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8x.webp');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should detect VP8L (lossless)', function () {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8l.webp');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8L header with bad code block', function () {
      var size = probe.sync(str2arr('RIFF....WEBPVP8L........................'));

      assert.equal(size, null);
    });


    it('coverage - truncated WEBP', function () {
      var buf;

      buf = str2arr('RIFF"\0\0\0WEBPVP8 ');
      assert.equal(probe.sync(buf), null);

      buf = str2arr('RIFF"\0\0\0WEBPVP8L');
      assert.equal(probe.sync(buf), null);

      buf = str2arr('RIFF"\0\0\0WEBPVP8X');
      assert.equal(probe.sync(buf), null);
    });
  });
});
