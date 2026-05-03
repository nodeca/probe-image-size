'use strict';


const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const probe = require('../');


function fixture (s) {
  return Buffer.from(
    s.replace(/;.*/mg, '')
      .match(/[0-9a-f]{2}/gi)
      .map(i => parseInt(i, 16))
  );
}


describe('probeBuffer', function () {
  it('should skip unrecognized files', function () {
    const file = path.join(__dirname, 'fixtures', 'text_file.txt');
    const size = probe.sync(fs.readFileSync(file));

    assert.strictEqual(size, null);
  });


  it('should skip empty files', function () {
    const file = path.join(__dirname, 'fixtures', 'empty.txt');
    const size = probe.sync(fs.readFileSync(file));

    assert.strictEqual(size, null);
  });


  it('should reject parser results with non-positive width', function () {
    const buf = fixture(`
      ; Minimal PNG header data consumed by the parser:
      ; signature, first chunk length, IHDR marker, width, height.
      89 50 4E 47 0D 0A 1A 0A ; PNG signature
      00 00 00 0D             ; IHDR data length
      49 48 44 52             ; IHDR
      00 00 00 00             ; width = 0, invalid
      00 00 00 01             ; height = 1
    `);

    assert.strictEqual(probe.sync(buf), null);
  });


  it('should reject parser results with non-positive height', function () {
    const buf = fixture(`
      ; Minimal PNG header data consumed by the parser:
      ; signature, first chunk length, IHDR marker, width, height.
      89 50 4E 47 0D 0A 1A 0A ; PNG signature
      00 00 00 0D             ; IHDR data length
      49 48 44 52             ; IHDR
      00 00 00 01             ; width = 1
      00 00 00 00             ; height = 0, invalid
    `);

    assert.strictEqual(probe.sync(buf), null);
  });
});
