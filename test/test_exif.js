
'use strict';


const assert  = require('assert');
const fs      = require('fs');
const path    = require('path');
const exif    = require('../lib/exif_utils');


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
});
