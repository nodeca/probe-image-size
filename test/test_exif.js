
'use strict';


const assert  = require('assert');
const fs      = require('fs');
const path    = require('path');
const exif    = require('../lib/exif_utils');


function fixture(s) {
  return Buffer.from(
    s.replace(/;.*/mg, '')
      .match(/[0-9a-f]{2}/gi)
      .map(i => parseInt(i, 16))
  );
}


describe('Exif parser', function () {
  it('should iterate through exif', async function () {
    let expected_exif_fields = {
      '0:272:2:23': 'image_blob_reduce test',
      '0:274:3:1': [ 6 ],
      '0:282:5:1': null,
      '0:283:5:1': null,
      '0:296:3:1': [ 2 ],
      '0:531:3:1': [ 1 ],
      '0:34853:4:1': [ 138 ],
      '34853:0:1:4': [ 2, 3, 0, 0 ],
      '34853:2:5:3': null,
      '34853:4:5:3': null,
      '1:513:4:1': [ 258 ],
      '1:514:4:1': [ 658 ]
    };
    let image   = fs.readFileSync(path.join(__dirname, 'fixtures', 'test.exif'));
    let entries = {};
    new exif.ExifParser(image, 0, image.length).each(entry => {
      entries[entry.ifd + ':' + entry.tag + ':' + entry.format + ':' + entry.count] = entry.value;
    });
    assert.deepEqual(entries, expected_exif_fields);
  });


  it('should read all exif formats', async function () {
    let expected_exif_fields = {
      '0:50000:2:4': 'abc',
      '0:50001:1:2': [ 255, 34 ],
      '0:50002:6:2': [ -1, 34 ],
      '0:50003:3:2': [ 65314, 13124 ],
      '0:50004:8:2': [ -222, 13124 ],
      '0:50005:4:1': [ 4280431428 ],
      '0:50006:9:1': [ -14535868 ],
      '0:50007:5:1': null,
      '0:50008:10:1': null,
      '0:50009:11:1': null,
      '0:50010:12:1': null,
      '0:50011:7:1': null,
      '0:50012:255:1': null
    };

    let data = fixture(`
      4D 4D 00 2A ; TIFF signature
      00 00 00 08 ; next IFD
      ; = 0x08
      00 0D ; IFD0
      C3 50 00 02 00 00 00 04 61 62 63 00 ; ascii string
      C3 51 00 01 00 00 00 02 FF 22 00 00 ; unsigned byte
      C3 52 00 06 00 00 00 02 FF 22 00 00 ; signed byte
      C3 53 00 03 00 00 00 02 FF 22 33 44 ; unsigned short
      C3 54 00 08 00 00 00 02 FF 22 33 44 ; signed short
      C3 55 00 04 00 00 00 01 FF 22 33 44 ; unsigned long
      C3 56 00 09 00 00 00 01 FF 22 33 44 ; signed long
      C3 57 00 05 00 00 00 01 00 00 00 00 ; unsigned rational - not implemented
      C3 58 00 0A 00 00 00 01 00 00 00 00 ; signed rational - not implemented
      C3 59 00 0B 00 00 00 01 00 00 00 00 ; single float - not implemented
      C3 5A 00 0C 00 00 00 01 00 00 00 00 ; double float - not implemented
      C3 5B 00 07 00 00 00 01 00 00 00 00 ; undefined
      C3 5C 00 FF 00 00 00 01 00 00 00 00 ; unknown type
      00 00 00 00 ; next IFD
    `);

    let entries = {};
    new exif.ExifParser(data, 0, data.length).each(entry => {
      entries[entry.ifd + ':' + entry.tag + ':' + entry.format + ':' + entry.count] = entry.value;
    });
    assert.deepEqual(entries, expected_exif_fields);
  });


  it('should decode utf8 if possible', async function () {
    let expected_exif_fields = {
      '0:50000:2:3': 'α',
      '0:50001:2:3': '\xff\xff',
      '0:50002:2:4': 'αβ'
    };

    let data = fixture(`
      4D 4D 00 2A ; TIFF signature
      00 00 00 08 ; next IFD
      ; = 0x08
      00 03 ; IFD0
      C3 50 00 02 00 00 00 03 CE B1 00 00
      C3 51 00 02 00 00 00 03 FF FF 00 00
      C3 52 00 02 00 00 00 04 CE B1 CE B2 ; no trailing NUL byte
      00 00 00 00 ; next IFD
    `);

    let entries = {};
    new exif.ExifParser(data, 0, data.length).each(entry => {
      entries[entry.ifd + ':' + entry.tag + ':' + entry.format + ':' + entry.count] = entry.value;
    });
    assert.deepEqual(entries, expected_exif_fields);
  });


  it('coverage - unexpected EOF', async function () {
    let data;

    data = fixture(`
      4D 4D 00 2A ; TIFF signature
      00 00 00 08 ; next IFD
      ; = 0x08
      00 03 ; IFD0
      C3
    `);

    assert.throws(() => {
      new exif.ExifParser(data, 0, data.length).each(() => {});
    }, /unexpected EOF/);

    data = fixture(`
      4D 4D 00 2A ; TIFF signature
      00 00 00 08 ; next IFD
      ; = 0x08
      00 03 ; IFD0
      C3 50 00 02 00
    `);

    assert.throws(() => {
      new exif.ExifParser(data, 0, data.length).each(() => {});
    }, /unexpected EOF/);

    data = fixture(`
      4D 4D 00 2A ; TIFF signature
      00 00 00 08 ; next IFD
      ; = 0x08
      00 03 ; IFD0
      C3 50 00 02 00 00 FF FF 00 00 00 00
    `);

    assert.throws(() => {
      new exif.ExifParser(data, 0, data.length).each(() => {});
    }, /unexpected EOF/);
  });


  it('should parse subIFDs', async function () {
    let expected_exif_fields = {
      '0:34665:4:1': [ 38 ],
      '0:34853:4:1': [ 64 ],
      '34665:40965:4:1': [ 78 ],
      '34665:50001:2:4': 'abc',
      '34853:50002:2:4': 'abc',
      '40965:50003:2:4': 'abc'
    };

    let data = fixture(`
      49 49 2A 00 ; TIFF signature
      08 00 00 00 ; next IFD
      ; = 0x08
      02 00 ; IFD0
      69 87 04 00 01 00 00 00 26 00 00 00
      25 88 04 00 01 00 00 00 40 00 00 00
      00 00 00 00 ; next IFD
      ; = 0x26
      02 00 ; SubIFD
      51 C3 02 00 04 00 00 00 61 62 63 00
      05 A0 04 00 01 00 00 00 4E 00 00 00
      ; = 0x40
      01 00 ; GPS Info
      52 C3 02 00 04 00 00 00 61 62 63 00
      ; = 0x4E
      01 00 ; Interop IFD
      53 C3 02 00 04 00 00 00 61 62 63 00
    `);

    let entries = {};
    new exif.ExifParser(data, 0, data.length).each(entry => {
      entries[entry.ifd + ':' + entry.tag + ':' + entry.format + ':' + entry.count] = entry.value;
    });
    assert.deepEqual(entries, expected_exif_fields);
  });


  it('should not parse if subIFD offset is not a number', async function () {
    let expected_exif_fields = {
      '0:34665:2:1': '&',
      '0:34853:2:1': '@'
    };

    let data = fixture(`
      49 49 2A 00 ; TIFF signature
      08 00 00 00 ; next IFD
      ; = 0x08
      02 00 ; IFD0
      69 87 02 00 01 00 00 00 26 00 00 00
      25 88 02 00 01 00 00 00 40 00 00 00
      00 00 00 00 ; next IFD
      ; = 0x26
      02 00 ; SubIFD
      51 C3 02 00 04 00 00 00 61 62 63 00
      05 A0 02 00 01 00 00 00 4E 00 00 00
      ; = 0x40
      01 00 ; GPS Info
      52 C3 02 00 04 00 00 00 61 62 63 00
      ; = 0x4E
      01 00 ; Interop IFD
      53 C3 02 00 04 00 00 00 61 62 63 00
    `);

    let entries = {};
    new exif.ExifParser(data, 0, data.length).each(entry => {
      entries[entry.ifd + ':' + entry.tag + ':' + entry.format + ':' + entry.count] = entry.value;
    });
    assert.deepEqual(entries, expected_exif_fields);
  });


  describe('get_orientation', function () {
    it('should read exif orientation', async function () {
      let data = fixture(`
        49 49 2A 00 ; TIFF signature
        08 00 00 00 ; next IFD
        ; = 0x08
        02 00 ; IFD0
        32 01 02 00 04 00 00 00 FF FF FF 00 ; entry 1 - ModifyDate
        12 01 03 00 01 00 00 00 06 00 00 00 ; entry 2 - Orientation
        00 00 00 00 ; next IFD
      `);

      assert.strictEqual(exif.get_orientation(data), 6);
    });


    it('should return 0 if no orientation tag', async function () {
      let data = fixture(`
        49 49 2A 00 ; TIFF signature
        08 00 00 00 ; next IFD
        ; = 0x08
        01 00 ; IFD0
        32 01 02 00 04 00 00 00 FF FF FF 00 ; entry 1 - ModifyDate
        00 00 00 00 ; next IFD
      `);

      assert.strictEqual(exif.get_orientation(data), 0);
    });


    it('should return -1 on error', async function () {
      let data = fixture('00 00 00 00');
      assert.strictEqual(exif.get_orientation(data), -1);
    });
  });
});
