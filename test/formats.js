
'use strict';


const assert  = require('assert');
const fs      = require('fs');
const path    = require('path');
const probe   = require('../');
const str2arr = require('../lib/common').str2arr;
const { Readable } = require('stream');


/* eslint-disable max-len */
describe('File formats', function () {
  describe('BMP', function () {
    it('should detect BMP', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('BMP (sync)', function () {
    it('should detect BMP', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.bmp');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('GIF', function () {
    it('should detect GIF', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('GIF (sync)', function () {
    it('should detect GIF', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.gif');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('ICO', function () {
    it('should detect ICO', async function () {
      let file = path.join(__dirname, 'fixtures', 'google.ico');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
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


  describe('ICO (sync)', function () {
    it('should detect ICO', function () {
      let file = path.join(__dirname, 'fixtures', 'google.ico');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
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
    it('should detect JPEG', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    // regression test
    it('should not fail on empty JPEG markers', async function () {
      let file = path.join(__dirname, 'fixtures', 'empty_comment.jpg');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('should not fail on bad JPEG', async function () {
      // length of C0 is less than needed (should be 5+ bytes)
      let buf = Buffer.from('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex');

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });


    it('should skip padding', async function () {
      let buf = Buffer.from('FFD8 FFFFFFFFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex');

      let size = await probe(Readable.from([ buf ]));

      assert.deepStrictEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('coverage - EOI before SOI', async function () {
      let buf = Buffer.from('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex');

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });


    it('coverage - unknown marker', async function () {
      let buf = Buffer.from('FFD8 FF05'.replace(/ /g, ''), 'hex');

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });
  });


  describe('JPEG (sync)', function () {
    it('should detect JPEG', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('should not fail on empty JPEG markers', function () {
      let file = path.join(__dirname, 'fixtures', 'empty_comment.jpg');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('should not fail on bad JPEG', function () {
      // length of C0 is less than needed (should be 5+ bytes)
      let buf = str2arr('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex');
      let size = probe.sync(buf);

      assert.strictEqual(size, null);
    });


    it('should skip padding', function () {
      let buf = str2arr('FFD8 FFFFFFFFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex');
      let size = probe.sync(buf);

      assert.deepStrictEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('coverage - EOI before SOI', function () {
      let buf = str2arr('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex');

      assert.strictEqual(probe.sync(buf), null);
    });


    it('coverage - unknown marker', function () {
      let buf = str2arr('FFD8 FF05'.replace(/ /g, ''), 'hex');

      assert.strictEqual(probe.sync(buf), null);
    });


    it('coverage - truncated JPEG', function () {
      let buf;

      buf = str2arr('FFD8 FF'.replace(/ /g, ''), 'hex');
      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr('FFD8 FFC0 00'.replace(/ /g, ''), 'hex');
      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr('FFD8 FFC0 FFFF 00'.replace(/ /g, ''), 'hex');
      assert.strictEqual(probe.sync(buf), null);
    });
  });


  describe('PNG', function () {
    it('should detect PNG', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.png');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip PNG start pattern without IHDR', async function () {
      let buf = Buffer.from(str2arr('\x89PNG\r\n\x1a\n                  '));

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });
  });


  describe('PNG (sync)', function () {
    it('should detect PNG', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.png');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip PNG start pattern without IHDR', function () {
      let size = probe.sync(str2arr('\x89PNG\r\n\x1a\n                  '));

      assert.strictEqual(size, null);
    });
  });


  describe('PSD', function () {
    it('should detect PSD', async function () {
      let file = path.join(__dirname, 'fixtures', 'empty.psd');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('PSD (sync)', function () {
    it('should detect PSD', function () {
      let file = path.join(__dirname, 'fixtures', 'empty.psd');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' });
    });
  });


  describe('SVG', function () {
    it('should detect SVG', async function () {
      let file = path.join(__dirname, 'fixtures', 'sample.svg');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should work with weirdly split chunks', async function () {
      let size = await probe(Readable.from([
        Buffer.from('   '),
        Buffer.from(' <s'),
        Buffer.from('vg width="5" height="5"></svg>')
      ]));

      assert.deepStrictEqual(size, { width: 5, height: 5, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from viewbox', async function () {
      let size = await probe(Readable.from([ Buffer.from('<svg viewbox="0 0 800 600"></svg>') ]));

      assert.deepStrictEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from camel cased viewBox', async function () {
      let size = await probe(Readable.from([ Buffer.from('<svg viewBox="0 0 800 600"></svg>') ]));

      assert.deepStrictEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should return width/height units', async function () {
      let size = await probe(Readable.from([ Buffer.from('<svg width="5in" height="4pt"></svg>') ]));

      assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
    });

    it('should ignore stroke-width', async function () {
      let size = await probe(Readable.from([ Buffer.from('<svg stroke-width="2" width="5" height="4"></svg>') ]));

      assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    /* eslint-disable max-nested-callbacks */
    describe('coverage', function () {
      it('too much data before doctype', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.alloc(70000, 0x20) ])),
          /unrecognized file format/
        );
      });

      it('too much data before svg', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg'), Buffer.alloc(70000, 0x20) ])),
          /unrecognized file format/
        );
      });

      it('single quotes (width/height)', async function () {
        let size = await probe(Readable.from([ Buffer.from("<svg width='5in' height='4pt'></svg>") ]));

        assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
      });

      it('single quotes (viewbox)', async function () {
        let size = await probe(Readable.from([ Buffer.from("<svg width='1in' viewbox='0 0 100 50'>") ]));

        assert.deepStrictEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('height, no width', async function () {
        let size = await probe(Readable.from([ Buffer.from('<svg height="1in" viewbox="0 0 100 50">') ]));

        assert.deepStrictEqual(size, { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('width is invalid, no height', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg width="-1" viewbox="0 0 100 50">') ])),
          /unrecognized file format/
        );
      });

      it('height is invalid, no width', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg height="foobar" viewbox="0 0 100 50">') ])),
          /unrecognized file format/
        );
      });

      it('width is invalid (non positive)', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg width="0" height="5">') ])),
          /unrecognized file format/
        );
      });

      it('width is invalid (Infinity)', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg width="Infinity" height="5">') ])),
          /unrecognized file format/
        );
      });

      it('no viewbox, no height', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg width="5">') ])),
          /unrecognized file format/
        );
      });

      it('viewbox units are different', async function () {
        await assert.rejects(
          async () => probe(Readable.from([ Buffer.from('<svg width="5" viewbox="0 0 5px 3in">') ])),
          /unrecognized file format/
        );
      });
    });
  });


  describe('SVG (sync)', function () {
    it('should detect SVG', function () {
      let file = path.join(__dirname, 'fixtures', 'sample.svg');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from viewbox', function () {
      let size = probe.sync(Buffer.from('<svg viewbox="0 0 800 600"></svg>'));

      assert.deepStrictEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should extract width info from camel cased viewBox', function () {
      let size = probe.sync(Buffer.from('<svg viewBox="0 0 800 600"></svg>'));

      assert.deepStrictEqual(size, { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should return width/height units', function () {
      let size = probe.sync(Buffer.from('<svg width="5in" height="4pt"></svg>'));

      assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
    });

    it('should ignore stroke-width', function () {
      let size = probe.sync(Buffer.from('<svg stroke-width="2" width="5" height="4"></svg>'));

      assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    describe('coverage', function () {
      it('wrong signature', function () {
        let size = probe.sync(Buffer.from('  <not-really-svg width="1" height="1">'));

        assert.strictEqual(size, null);
      });

      it('single quotes (width/height)', function () {
        let size = probe.sync(Buffer.from("<svg width='5in' height='4pt'></svg>"));

        assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' });
      });

      it('single quotes (viewbox)', function () {
        let size = probe.sync(Buffer.from("<svg width='1in' viewbox='0 0 100 50'>"));

        assert.deepStrictEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('width, no height', function () {
        let size = probe.sync(Buffer.from('<svg width="1in" viewbox="0 0 100 50">'));

        assert.deepStrictEqual(size, { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('height, no width', function () {
        let size = probe.sync(Buffer.from('<svg height="1in" viewbox="0 0 100 50">'));

        assert.deepStrictEqual(size, { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' });
      });

      it('width is invalid, no height', function () {
        let size = probe.sync(Buffer.from('<svg width="-1" viewbox="0 0 100 50">'));

        assert.deepStrictEqual(size, null);
      });

      it('height is invalid, no width', function () {
        let size = probe.sync(Buffer.from('<svg height="foobar" viewbox="0 0 100 50">'));

        assert.deepStrictEqual(size, null);
      });

      it('width is invalid (non positive)', function () {
        let size = probe.sync(Buffer.from('<svg width="0" height="5">'));

        assert.deepStrictEqual(size, null);
      });

      it('width is invalid (Infinity)', function () {
        let size = probe.sync(Buffer.from('<svg width="Infinity" height="5">'));

        assert.deepStrictEqual(size, null);
      });

      it('no viewbox, no height', function () {
        let size = probe.sync(Buffer.from('<svg width="5">'));

        assert.deepStrictEqual(size, null);
      });

      it('viewbox units are different', function () {
        let size = probe.sync(Buffer.from('<svg width="5" viewbox="0 0 5px 3in">'));

        assert.deepStrictEqual(size, null);
      });
    });
  });


  describe('TIFF', function () {
    it('real image', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('real image, Big Endian', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo_be.tiff');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('TIFF IFD is first in the file', async function () {
      let file = path.join(__dirname, 'fixtures', 'meta_before_image.tiff');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('bad TIFF IFD', async function () {
      // zero entries in 1st ifd, invalid TIFF
      //                     sig     off      count next
      let buf = Buffer.from('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex');

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });


    it('bad TIFF IFD offset', async function () {
      // invalid 1st tiff offset
      //                     sig     off      count next
      let buf = Buffer.from('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex');

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });


    it('bad TIFF IFD value', async function () {
      // invalid ifd type (FF instead of 03 or 04)
      //                     sig     off  count next
      let buf = Buffer.from((
        '49492A00 08000000 0200' + // sig, off, count
        '0001 0000 01000000 FF000000' +
        '0101 0400 01000000 2A000000' +
        '00000000' // next
      ).replace(/ /g, ''), 'hex');

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });
  });


  describe('TIFF (sync)', function () {
    it('real image', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.tiff');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('real image, Big Endian', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo_be.tiff');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('TIFF IFD is first in the file', function () {
      let file = path.join(__dirname, 'fixtures', 'meta_before_image.tiff');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' });
    });


    it('bad TIFF IFD', function () {
      // zero entries in 1st ifd, invalid TIFF
      //                     sig     off      count next
      let buf = str2arr('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex');

      assert.strictEqual(probe.sync(buf), null);
    });


    it('bad TIFF IFD offset', function () {
      // invalid 1st tiff offset
      //                     sig     off      count next
      let buf = str2arr('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex');

      assert.strictEqual(probe.sync(buf), null);
    });


    it('bad TIFF IFD value', function () {
      // invalid ifd type (FF instead of 03 or 04)
      //                     sig     off  count next
      let buf = str2arr((
        '49492A00 08000000 0200' + // sig, off, count
        '0001 0000 01000000 FF000000' +
        '0101 0400 01000000 2A000000' +
        '00000000' // next
      ).replace(/ /g, ''), 'hex');

      assert.strictEqual(probe.sync(buf), null);
    });


    it('coverage - truncated TIFF', function () {
      let buf;

      buf = str2arr('49492A00 08000000 02'.replace(/ /g, ''), 'hex');
      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr('49492A00 08000000 0200 00'.replace(/ /g, ''), 'hex');
      assert.strictEqual(probe.sync(buf), null);
    });
  });


  describe('WEBP', function () {
    it('should detect VP8', async function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8 header with bad code block', async function () {
      let buf = Buffer.from(str2arr('RIFF....WEBPVP8 ........................'));

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });


    it('should detect VP8X', async function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8x.webp');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should detect VP8L (lossless)', async function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8l.webp');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8L header with bad code block', async function () {
      let buf = Buffer.from(str2arr('RIFF....WEBPVP8L........................'));

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });
  });


  describe('WEBP (sync)', function () {
    it('should detect VP8', function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8 header with bad code block', function () {
      let size = probe.sync(str2arr('RIFF....WEBPVP8 ........................'));

      assert.strictEqual(size, null);
    });


    it('should detect VP8X', function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8x.webp');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should detect VP8L (lossless)', function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8l.webp');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8L header with bad code block', function () {
      let size = probe.sync(str2arr('RIFF....WEBPVP8L........................'));

      assert.strictEqual(size, null);
    });


    it('coverage - truncated WEBP', function () {
      let buf;

      buf = str2arr('RIFF"\0\0\0WEBPVP8 ');
      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr('RIFF"\0\0\0WEBPVP8L');
      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr('RIFF"\0\0\0WEBPVP8X');
      assert.strictEqual(probe.sync(buf), null);
    });
  });
});
