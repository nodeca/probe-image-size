
'use strict';


const assert  = require('assert');
const fs      = require('fs');
const path    = require('path');
const probe   = require('../');
const str2arr = require('../lib/common').str2arr;
const { Readable } = require('stream');


/* eslint-disable max-len */
/* eslint-disable no-undefined */
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


    it('should display 0 size as 256', async function () {
      let file = path.join(__dirname, 'fixtures', 'google1.ico');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 256,
        height: 256,
        variants: [
          { height: 256, width: 256 },
          { height: 24, width: 24 }
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


    it('should display 0 size as 256', function () {
      let file = path.join(__dirname, 'fixtures', 'google1.ico');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 256,
        height: 256,
        variants: [
          { height: 256, width: 256 },
          { height: 24, width: 24 }
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


    it('should detect JPEG orientation', async function () {
      let file = path.join(__dirname, 'fixtures', 'Exif5-1.5x.jpg');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 192,
        height: 192,
        type: 'jpg',
        mime: 'image/jpeg',
        wUnits: 'px',
        hUnits: 'px',
        orientation: 5
      });
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


    it('coverage - 0xE1 segment but not exif', async function () {
      let buf = Buffer.from('FFD8 FFE10010AAAAAAAAAAAAAAAAAAAAAAAAAAAA FFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex');

      let size = await probe(Readable.from([ buf ]));

      assert.strictEqual(size.width, 15);
    });
  });


  describe('JPEG (sync)', function () {
    it('should detect JPEG', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' });
    });


    it('should detect JPEG orientation', async function () {
      let file = path.join(__dirname, 'fixtures', 'Exif5-1.5x.jpg');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 192,
        height: 192,
        type: 'jpg',
        mime: 'image/jpeg',
        wUnits: 'px',
        hUnits: 'px',
        orientation: 5
      });
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


    it('coverage - 0xE1 segment but not exif', async function () {
      let buf = Buffer.from('FFD8 FFE10010AAAAAAAAAAAAAAAAAAAAAAAAAAAA FFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex');

      let size = probe.sync(buf);
      assert.strictEqual(size.width, 15);
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


  describe('AVIF', function () {
    it('should detect AVIF', async function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.avif');
      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 367,
        height: 187,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px'
      });
    });


    it('should detect AVIF orientation from irot/imir', async function () {
      let file = path.join(__dirname, 'fixtures', 'Rot3Mir1-1.5x.avif');
      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 192,
        height: 192,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px',
        orientation: 5
      });
    });


    it('should detect AVIF orientation from Exif', async function () {
      let file = path.join(__dirname, 'fixtures', 'Exif5-1.5x.avif');
      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 192,
        height: 192,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px',
        orientation: 5
      });
    });


    it('should detect HEIC - image4.heic', async function () {
      let file = path.join(__dirname, 'fixtures', 'image4.heic');
      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 700,
        height: 476,
        type: 'heic',
        mime: 'image/heic',
        wUnits: 'px',
        hUnits: 'px',
        variants: [
          { width: 700, height: 476 },
          { width: 700, height: 476 }
        ],
        orientation: 1
      });
    });


    it('should detect HEIC - MIAF002.heic', async function () {
      let file = path.join(__dirname, 'fixtures', 'MIAF002.heic');
      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size, {
        width: 2048,
        height: 2048,
        type: 'heif',
        mime: 'image/heif',
        wUnits: 'px',
        hUnits: 'px',
        variants: [
          { width: 2048, height: 2048 },
          { width: 160, height: 160 }
        ]
      });
    });


    it('minimal AVIF file', async function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.from(buf) ]));

      assert.strictEqual(size.width, 16909060);
    });


    it('minimal AVIF file + transforms', async function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x42 meta \0\0\0\0 ' +
        '\0\0\0\x36 iprp ' +
        '\0\0\0\x2E ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\x09 imir \x00' +
        '\0\0\0\x09 irot \x03'
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.from(buf) ]));

      assert.strictEqual(size.orientation, 5);
    });


    it('minimal AVIF file + EXIF', async function () {
      // orientation=5 minimal exif from Exif5-1.5x file
      let exif_data = Buffer.from((
        '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
        '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
        '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
        '00480000 0001').replace(/ /g, ''), 'hex');

      let buf = str2arr((
        // first column is length of the box, indents show hierarchy
        '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x72     meta \0\0\0\0 ' +
        '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
        '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
        '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x62' +
        '\0\0\0\x24     iprp ' +
        '  \0\0\0\x1C   ipco ' +
        '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\0       mdat ' +
        '               \0\0\0\x06 Exif \0\0'
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.concat([ Buffer.from(buf), exif_data ]) ]));

      assert.strictEqual(size.orientation, 5);
    });


    it('coverage - sig offset more than exif length', async function () {
      // orientation=5 minimal exif from Exif5-1.5x file
      let exif_data = Buffer.from((
        '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
        '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
        '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
        '00480000 0001').replace(/ /g, ''), 'hex');

      let buf = str2arr((
        // first column is length of the box, indents show hierarchy
        '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x72     meta \0\0\0\0 ' +
        '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
        '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +                 //  vvv - bad data here
        '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x02' +
        '\0\0\0\x24     iprp ' +
        '  \0\0\0\x1C   ipco ' +
        '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\0       mdat ' +
        '               \0\0\0\x06 Exif \0\0'
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.concat([ Buffer.from(buf), exif_data ]) ]));

      assert.strictEqual(size.orientation, undefined);
    });


    it('coverage - wrong infe, wrong ref index', async function () {
      // orientation=5 minimal exif from Exif5-1.5x file
      let exif_data = Buffer.from((
        '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
        '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
        '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
        '00480000 0001').replace(/ /g, ''), 'hex');

      let buf = str2arr((
        // first column is length of the box, indents show hierarchy
        '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x72     meta \0\0\0\0 ' +
        '  \0\0\0\x26   iinf \0\0\0\0 \0\x02' +
        '    \0\0\0\x18 free \0\0\0\0 \0\0\0\0 \0\0\0\0 \0\0\0\0' +
        '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\x01 \0\x46\0\x01 \0\x48\0\x62' +
        '\0\0\0\x24     iprp ' +
        '  \0\0\0\x1C   ipco ' +
        '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\0       mdat ' +
        '               \0\0\0\x06 Exif \0\0'
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.concat([ Buffer.from(buf), exif_data ]) ]));

      assert.strictEqual(size.orientation, undefined);
    });


    it('should keep largest size in ispe', async function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x58 meta \0\0\0\0 ' +
        '\0\0\0\x4C iprp ' +
        '\0\0\0\x44 ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x30 \x00\x00\x00\x40' +
        '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x04\x00 \x00\x00\x00\x10' +
        '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x10 \x00\x00\x05\x00'
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.from(buf) ]));

      assert.deepStrictEqual(size, {
        width: 16,
        height: 1280,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px',
        variants: [
          { width: 48, height: 64 },
          { width: 1024, height: 16 },
          { width: 16, height: 1280 }
        ]
      });
    });


    it('invalid format (mp4)', async function () {
      let buf = str2arr((
        '\0\0\0\x10 ftyp 3gp5 \0\0\0\0' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );
    });


    it('coverage - invalid box lengths', async function () {
      let buf;

      buf = str2arr((
        '\0\0\0\x06 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x06 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x06 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x06 ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x06 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );
    });


    it('coverage - should not look past mdat', async function () {
      let buf;

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x0C mdat \0\0\0\0 ' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      await assert.rejects(
        async () => probe(Readable.from([ Buffer.from(buf) ])),
        /unrecognized file format/
      );
    });


    it('coverage - other fields', async function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x0C free \0\0\0\0 ' +
        '\0\0\0\x4C meta \0\0\0\0 ' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x38 iprp ' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x28 ipco ' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\x0C free \0\0\0\0 '
      ).replace(/ /g, ''));

      let size = await probe(Readable.from([ Buffer.from(buf) ]));

      assert.strictEqual(size.width, 16909060);
    });


    it('coverage - mime types', async function () {
      let buf;

      buf = str2arr((
        '\0\0\0\x14 ftyp hevc \0\0\0\0 msf1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        (await probe(Readable.from([ Buffer.from(buf) ]))).mime,
        'image/heic-sequence'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp mif1 \0\0\0\0 avif' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        (await probe(Readable.from([ Buffer.from(buf) ]))).mime,
        'image/avif'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp msf1 \0\0\0\0 heix' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        (await probe(Readable.from([ Buffer.from(buf) ]))).mime,
        'image/heif-sequence'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp mif1 \0\0\0\0 heix' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        (await probe(Readable.from([ Buffer.from(buf) ]))).mime,
        'image/heif'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp mif1 \0\0\0\0 xxxx' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        (await probe(Readable.from([ Buffer.from(buf) ]))).mime,
        'image/avif'
      );
    });
  });


  describe('AVIF (sync)', function () {
    it('should detect AVIF', function () {
      let file = path.join(__dirname, 'fixtures', 'iojs_logo.avif');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 367,
        height: 187,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px'
      });
    });


    it('should detect AVIF orientation from irot/imir', async function () {
      let file = path.join(__dirname, 'fixtures', 'Rot3Mir1-1.5x.avif');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 192,
        height: 192,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px',
        orientation: 5
      });
    });


    it('should detect AVIF orientation from Exif', async function () {
      let file = path.join(__dirname, 'fixtures', 'Exif5-1.5x.avif');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 192,
        height: 192,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px',
        orientation: 5
      });
    });


    it('should detect HEIC - image4.heic', async function () {
      let file = path.join(__dirname, 'fixtures', 'image4.heic');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 700,
        height: 476,
        type: 'heic',
        mime: 'image/heic',
        wUnits: 'px',
        hUnits: 'px',
        variants: [
          { width: 700, height: 476 },
          { width: 700, height: 476 }
        ],
        orientation: 1
      });
    });


    it('should detect HEIC - MIAF002.heic', async function () {
      let file = path.join(__dirname, 'fixtures', 'MIAF002.heic');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, {
        width: 2048,
        height: 2048,
        type: 'heif',
        mime: 'image/heif',
        wUnits: 'px',
        hUnits: 'px',
        variants: [
          { width: 2048, height: 2048 },
          { width: 160, height: 160 }
        ]
      });
    });


    it('minimal AVIF file', function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      let size = probe.sync(buf);

      assert.strictEqual(size.width, 16909060);
    });


    it('minimal AVIF file + transforms', async function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x42 meta \0\0\0\0 ' +
        '\0\0\0\x36 iprp ' +
        '\0\0\0\x2E ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\x09 imir \x00' +
        '\0\0\0\x09 irot \x03'
      ).replace(/ /g, ''));

      let size = probe.sync(buf);

      assert.strictEqual(size.orientation, 5);
    });


    it('minimal AVIF file + EXIF', async function () {
      // orientation=5 minimal exif from Exif5-1.5x file
      let exif_data = Buffer.from((
        '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
        '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
        '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
        '00480000 0001').replace(/ /g, ''), 'hex');

      let buf = str2arr((
        // first column is length of the box, indents show hierarchy
        '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x72     meta \0\0\0\0 ' +
        '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
        '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
        '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x62' +
        '\0\0\0\x24     iprp ' +
        '  \0\0\0\x1C   ipco ' +
        '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\0       mdat ' +
        '               \0\0\0\x06 Exif \0\0'
      ).replace(/ /g, ''));

      let size = probe.sync(Buffer.concat([ Buffer.from(buf), exif_data ]));

      assert.strictEqual(size.orientation, 5);
    });


    it('coverage - sig offset more than exif length', async function () {
      // orientation=5 minimal exif from Exif5-1.5x file
      let exif_data = Buffer.from((
        '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
        '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
        '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
        '00480000 0001').replace(/ /g, ''), 'hex');

      let buf = str2arr((
        // first column is length of the box, indents show hierarchy
        '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x72     meta \0\0\0\0 ' +
        '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
        '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +                 //  vvv - bad data here
        '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x02' +
        '\0\0\0\x24     iprp ' +
        '  \0\0\0\x1C   ipco ' +
        '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\0       mdat ' +
        '               \0\0\0\x06 Exif \0\0'
      ).replace(/ /g, ''));

      let size = probe.sync(Buffer.concat([ Buffer.from(buf), exif_data ]));

      assert.strictEqual(size.orientation, undefined);
    });


    it('coverage - wrong infe, wrong ref index', async function () {
      // orientation=5 minimal exif from Exif5-1.5x file
      let exif_data = Buffer.from((
        '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
        '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
        '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
        '00480000 0001').replace(/ /g, ''), 'hex');

      let buf = str2arr((
        // first column is length of the box, indents show hierarchy
        '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x72     meta \0\0\0\0 ' +
        '  \0\0\0\x26   iinf \0\0\0\0 \0\x02' +
        '    \0\0\0\x18 free \0\0\0\0 \0\0\0\0 \0\0\0\0 \0\0\0\0' +
        '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\x01 \0\x46\0\x01 \0\x48\0\x62' +
        '\0\0\0\x24     iprp ' +
        '  \0\0\0\x1C   ipco ' +
        '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\0       mdat ' +
        '               \0\0\0\x06 Exif \0\0'
      ).replace(/ /g, ''));

      let size = probe.sync(Buffer.concat([ Buffer.from(buf), exif_data ]));

      assert.strictEqual(size.orientation, undefined);
    });


    it('should keep largest size in ispe', function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x58 meta \0\0\0\0 ' +
        '\0\0\0\x4C iprp ' +
        '\0\0\0\x44 ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x30 \x00\x00\x00\x40' +
        '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x04\x00 \x00\x00\x00\x10' +
        '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x10 \x00\x00\x05\x00'
      ).replace(/ /g, ''));

      let size = probe.sync(buf);

      assert.deepStrictEqual(size, {
        width: 16,
        height: 1280,
        type: 'avif',
        mime: 'image/avif',
        wUnits: 'px',
        hUnits: 'px',
        variants: [
          { width: 48, height: 64 },
          { width: 1024, height: 16 },
          { width: 16, height: 1280 }
        ]
      });
    });


    it('invalid format (mp4)', function () {
      let buf = str2arr((
        '\0\0\0\x10 ftyp 3gp5 \0\0\0\0' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);
    });


    it('coverage - invalid box lengths', function () {
      let buf;

      buf = str2arr((
        '\0\0\0\x06 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x06 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x06 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x06 ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x06 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);
    });


    it('coverage - should not look past mdat', function () {
      let buf;

      buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x0C mdat \0\0\0\0 ' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(probe.sync(buf), null);
    });


    it('coverage - other fields', function () {
      let buf = str2arr((
        '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x0C free \0\0\0\0 ' +
        '\0\0\0\x4C meta \0\0\0\0 ' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x38 iprp ' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x28 ipco ' +
        '\0\0\0\x08 free ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
        '\0\0\0\x0C free \0\0\0\0 '
      ).replace(/ /g, ''));

      let size = probe.sync(buf);

      assert.strictEqual(size.width, 16909060);
    });


    it('coverage - mime types', async function () {
      let buf;

      buf = str2arr((
        '\0\0\0\x14 ftyp hevc \0\0\0\0 msf1' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        probe.sync(buf).mime,
        'image/heic-sequence'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp mif1 \0\0\0\0 avif' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        probe.sync(buf).mime,
        'image/avif'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp msf1 \0\0\0\0 heix' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        probe.sync(buf).mime,
        'image/heif-sequence'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp mif1 \0\0\0\0 heix' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        probe.sync(buf).mime,
        'image/heif'
      );

      buf = str2arr((
        '\0\0\0\x14 ftyp mif1 \0\0\0\0 xxxx' +
        '\0\0\0\x30 meta \0\0\0\0 ' +
        '\0\0\0\x24 iprp ' +
        '\0\0\0\x1C ipco ' +
        '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
      ).replace(/ /g, ''));

      assert.strictEqual(
        probe.sync(buf).mime,
        'image/avif'
      );
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

    it('should skip BOM', async function () {
      let size = await probe(Readable.from([ Buffer.from('\ufeff  <svg width="5" height="4"></svg>') ]));

      assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
    });

    it('should skip BOM in different chunks', async function () {
      let size = await probe(Readable.from([
        Buffer.from([ 0xEF ]),
        Buffer.from([ 0xBB, 0xBF ]),
        Buffer.from(' <s'),
        Buffer.from('vg width="'),
        Buffer.from('5" height="5"></svg>')
      ]));

      assert.deepStrictEqual(size, { width: 5, height: 5, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' });
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

    it('should skip BOM', async function () {
      let size = probe.sync(Buffer.from('\ufeff  <svg width="5" height="4"></svg>'));

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
      let buf = Buffer.from(str2arr('RIFF\x20\0\0\0WEBPVP8 \x0C\0\0\0....................'));

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
      let buf = Buffer.from(str2arr('RIFF\x20\0\0\0WEBPVP8L\x0C\0\0\0....................'));

      await assert.rejects(
        async () => probe(Readable.from([ buf ])),
        /unrecognized file format/
      );
    });


    it('should detect exif orientation', async function () {
      let file = path.join(__dirname, 'fixtures', 'Exif5-1.5x.webp');

      let size = await probe(fs.createReadStream(file));

      assert.deepStrictEqual(size.orientation, 5);
    });
  });


  describe('WEBP (sync)', function () {
    it('should detect VP8', function () {
      let file = path.join(__dirname, 'fixtures', 'webp-vp8.webp');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' });
    });


    it('should skip VP8 header with bad code block', function () {
      let size = probe.sync(str2arr('RIFF\x20\0\0\0WEBPVP8 \x0C\0\0\0....................'));

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


    it('should detect exif orientation', async function () {
      let file = path.join(__dirname, 'fixtures', 'Exif5-1.5x.webp');
      let size = probe.sync(fs.readFileSync(file));

      assert.deepStrictEqual(size.orientation, 5);
    });


    it('should skip VP8L header with bad code block', function () {
      let size = probe.sync(str2arr('RIFF\x20\0\0\0WEBPVP8L\x0C\0\0\0....................'));

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
