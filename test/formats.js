
'use strict';


var assert  = require('assert');
var fs      = require('fs');
var path    = require('path');
var from2   = require('from2');
var probe   = require('../');
var str2arr = require('../lib/common').str2arr;


function createBuffer(src, opts) {
  if (typeof src === 'number') {
    return Buffer.alloc ? Buffer.alloc(src, opts) : new Buffer(src, opts);
  }
  return Buffer.from ? Buffer.from(src, opts) : new Buffer(src, opts);
}


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
    it('should detect BMP', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' });
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
    it('should detect GIF', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' });
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

  describe('ICO', function () {
    it('should detect ICO', function () {
      var file = path.join(__dirname, 'fixtures', 'google.ico');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, {
          width: 128,
          height: 128,
          variants: [
            { height: 16, width: 16 },
            { height: 24, width: 24 },
            { height: 32, width: 32 },
            { height: 48, width: 48 },
            { height: 128, width: 128 }
          ],
          type: 'ico',
          mime: 'image/x-icon',
          wUnits: 'px',
          hUnits: 'px'
        });
      });
    });
  });


  describe('ICO (sync)', function () {
    it('should detect ICO', function () {
      var file = path.join(__dirname, 'fixtures', 'google.ico');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, {
        width: 128,
        height: 128,
        variants: [
          { height: 16, width: 16 },
          { height: 24, width: 24 },
          { height: 32, width: 32 },
          { height: 48, width: 48 },
          { height: 128, width: 128 }
        ],
        type: 'ico',
        mime: 'image/x-icon',
        wUnits: 'px',
        hUnits: 'px'
      });
    });
  });


  describe('JPEG', function () {
    it('should detect JPEG', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
      });
    });


    // regression test
    it('should not fail on empty JPEG markers', function () {
      var file = path.join(__dirname, 'fixtures', 'empty_comment.jpg');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('should not fail on bad JPEG', function () {
      // length of C0 is less than needed (should be 5+ bytes)
      var buf = createBuffer('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex');

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
    });


    it('should skip padding', function () {
      var buf = createBuffer('FFD8 FFFFFFFFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex');

      return probe(from2([ buf ])).then(size => {
        assert.deepEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('coverage - EOI before SOI', function () {
      var buf = createBuffer('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex');

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
    });


    it('coverage - unknown marker', function () {
      var buf = createBuffer('FFD8 FF05'.replace(/ /g, ''), 'hex');

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
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


    it('should skip padding', function () {
      var buf = str2arr('FFD8 FFFFFFFFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex');
      var size = probe.sync(buf);

      assert.deepEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
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
    it('should detect PNG', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.png');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('should skip PNG start pattern without IHDR', function () {
      var buf = createBuffer(str2arr('\x89PNG\r\n\x1a\n                  '));

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
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
    it('should detect PSD', function () {
      var file = path.join(__dirname, 'fixtures', 'empty.psd');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' });
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
    it('should detect SVG', function () {
      var file = path.join(__dirname, 'fixtures', 'sample.svg');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
      });
    });

    it('should work with weirdly split chunks', function () {
      return probe(from2([
        createBuffer('   '),
        createBuffer(' <s'),
        createBuffer('vg width="5" height="5"></svg>')
      ])).then(size => {
        assert.deepEqual(size, { width: 5, height: 5, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
      });
    });

    it('should extract width info from viewbox', function () {
      return probe(from2([
        createBuffer('<svg viewbox="0 0 800 600"></svg>')
      ])).then(size => {
        assert.deepEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
      });
    });

    it('should extract width info from camel cased viewBox', function () {
      return probe(from2([
        createBuffer('<svg viewBox="0 0 800 600"></svg>')
      ])).then(size => {
        assert.deepEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
      });
    });

    it('should return width/height units', function () {
      return probe(from2([
        createBuffer('<svg width="5in" height="4pt"></svg>')
      ])).then(size => {
        assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
      });
    });

    it('should ignore stroke-width', function () {
      return probe(from2([
        createBuffer('<svg stroke-width="2" width="5" height="4"></svg>')
      ])).then(size => {
        assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
      });
    });

    /* eslint-disable max-nested-callbacks */
    describe('coverage', function () {
      it('too much data before doctype', function () {
        var buf = createBuffer(70000);

        buf.fill(0x20);

        return probe(from2([ buf ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('too much data before svg', function () {
        var buf = createBuffer(70000);

        buf.fill(0x20);

        return probe(from2([ createBuffer('<svg'), buf ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('single quotes (width/height)', function () {
        return probe(from2([ createBuffer("<svg width='5in' height='4pt'></svg>") ])).then(size => {
          assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
        });
      });

      it('single quotes (viewbox)', function () {
        return probe(from2([ createBuffer("<svg width='1in' viewbox='0 0 100 50'>") ])).then(size => {
          assert.deepEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
        });
      });

      it('height, no width', function () {
        return probe(from2([ createBuffer('<svg height="1in" viewbox="0 0 100 50">') ])).then(size => {
          assert.deepEqual(size, { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
        });
      });

      it('width is invalid, no height', function () {
        return probe(from2([ createBuffer('<svg width="-1" viewbox="0 0 100 50">') ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('height is invalid, no width', function () {
        return probe(from2([ createBuffer('<svg height="foobar" viewbox="0 0 100 50">') ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('width is invalid (non positive)', function () {
        return probe(from2([ createBuffer('<svg width="0" height="5">') ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('width is invalid (Infinity)', function () {
        return probe(from2([ createBuffer('<svg width="Infinity" height="5">') ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('no viewbox, no height', function () {
        return probe(from2([ createBuffer('<svg width="5">') ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });

      it('viewbox units are different', function () {
        return probe(from2([ createBuffer('<svg width="5" viewbox="0 0 5px 3in">') ]))
          .then(() => { throw new Error('should throw'); })
          .catch(err => assert.equal(err.message, 'unrecognized file format'));
      });
    });
  });


  describe('SVG (sync)', function () {
    it('should detect SVG', function () {
      var file = path.join(__dirname, 'fixtures', 'sample.svg');
      var size = probe.sync(toArray(fs.readFileSync(file)));

      assert.deepEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from viewbox', function () {
      var size = probe.sync(toArray(createBuffer('<svg viewbox="0 0 800 600"></svg>')));

      assert.deepEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from camel cased viewBox', function () {
      var size = probe.sync(toArray(createBuffer('<svg viewBox="0 0 800 600"></svg>')));

      assert.deepEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should return width/height units', function () {
      var size = probe.sync(toArray(createBuffer('<svg width="5in" height="4pt"></svg>')));

      assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
    });

    it('should ignore stroke-width', function () {
      var size = probe.sync(toArray(createBuffer('<svg stroke-width="2" width="5" height="4"></svg>')));

      assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    describe('coverage', function () {
      it('wrong signature', function () {
        var size = probe.sync(toArray(createBuffer('  <not-really-svg width="1" height="1">')));

        assert.equal(size, null);
      });

      it('single quotes (width/height)', function () {
        var size = probe.sync(toArray(createBuffer("<svg width='5in' height='4pt'></svg>")));

        assert.deepEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
      });

      it('single quotes (viewbox)', function () {
        var size = probe.sync(toArray(createBuffer("<svg width='1in' viewbox='0 0 100 50'>")));

        assert.deepEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('width, no height', function () {
        var size = probe.sync(toArray(createBuffer('<svg width="1in" viewbox="0 0 100 50">')));

        assert.deepEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('height, no width', function () {
        var size = probe.sync(toArray(createBuffer('<svg height="1in" viewbox="0 0 100 50">')));

        assert.deepEqual(size, { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('width is invalid, no height', function () {
        var size = probe.sync(toArray(createBuffer('<svg width="-1" viewbox="0 0 100 50">')));

        assert.deepEqual(size, null);
      });

      it('height is invalid, no width', function () {
        var size = probe.sync(toArray(createBuffer('<svg height="foobar" viewbox="0 0 100 50">')));

        assert.deepEqual(size, null);
      });

      it('width is invalid (non positive)', function () {
        var size = probe.sync(toArray(createBuffer('<svg width="0" height="5">')));

        assert.deepEqual(size, null);
      });

      it('width is invalid (Infinity)', function () {
        var size = probe.sync(toArray(createBuffer('<svg width="Infinity" height="5">')));

        assert.deepEqual(size, null);
      });

      it('no viewbox, no height', function () {
        var size = probe.sync(toArray(createBuffer('<svg width="5">')));

        assert.deepEqual(size, null);
      });

      it('viewbox units are different', function () {
        var size = probe.sync(toArray(createBuffer('<svg width="5" viewbox="0 0 5px 3in">')));

        assert.deepEqual(size, null);
      });
    });
  });


  describe('TIFF', function () {
    it('real image', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('real image, Big Endian', function () {
      var file = path.join(__dirname, 'fixtures', 'iojs_logo_be.tiff');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('TIFF IFD is first in the file', function () {
      var file = path.join(__dirname, 'fixtures', 'meta_before_image.tiff');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('bad TIFF IFD', function () {
      // zero entries in 1st ifd, invalid TIFF
      //                     sig     off      count next
      var buf = createBuffer('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex');

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
    });


    it('bad TIFF IFD offset', function () {
      // invalid 1st tiff offset
      //                     sig     off      count next
      var buf = createBuffer('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex');

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
    });


    it('bad TIFF IFD value', function () {
      // invalid ifd type (FF instead of 03 or 04)
      //                     sig     off  count next
      var buf = createBuffer((
        '49492A00 08000000 0200' + // sig, off, count
        '0001 0000 01000000 FF000000' +
        '0101 0400 01000000 2A000000' +
        '00000000' // next
      ).replace(/ /g, ''), 'hex');

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
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
    it('should detect VP8', function () {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('should skip VP8 header with bad code block', function () {
      var buf = createBuffer(str2arr('RIFF....WEBPVP8 ........................'));

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
    });


    it('should detect VP8X', function () {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8x.webp');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('should detect VP8L (lossless)', function () {
      var file = path.join(__dirname, 'fixtures', 'webp-vp8l.webp');

      return probe(fs.createReadStream(file)).then(size => {
        assert.deepEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
      });
    });


    it('should skip VP8L header with bad code block', function () {
      var buf = createBuffer(str2arr('RIFF....WEBPVP8L........................'));

      return probe(from2([ buf ]))
        .then(() => { throw new Error('should throw'); })
        .catch(err => assert.equal(err.message, 'unrecognized file format'));
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
