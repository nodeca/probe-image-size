
'use strict';


const assert   = require('assert');
const fs       = require('fs');
const path     = require('path');
const probe    = require('../');
const { Readable } = require('stream');


describe('probeStream', function () {
  it('should process an image', async function () {
    let file = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');

    let size = await probe(fs.createReadStream(file));

    assert.strictEqual(size.width, 367);
    assert.strictEqual(size.height, 187);
    assert.strictEqual(size.mime, 'image/jpeg');
  });

  it('should skip unrecognized files', async function () {
    let file = path.join(__dirname, 'fixtures', 'text_file.txt');

    await assert.rejects(
      async () => probe(fs.createReadStream(file)),
      /unrecognized file format/
    );
  });

  it('should close stream unless asked to keep open', async function () {
    function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    }

    var filename, file;

    filename = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');
    file = fs.createReadStream(filename);
    await probe(file);
    await delay(100);
    assert.strictEqual(file.closed, true);

    filename = path.join(__dirname, 'fixtures', 'iojs_logo.jpeg');
    file = fs.createReadStream(filename);
    await probe(file, true);
    await delay(100);
    assert.strictEqual(file.closed, false);

    filename = path.join(__dirname, 'fixtures', 'text_file.txt');
    file = fs.createReadStream(filename);
    try { await probe(file); } catch (err) {}
    await delay(100);
    assert.strictEqual(file.closed, true);
  });

  it('should skip empty files', async function () {
    let file = path.join(__dirname, 'fixtures', 'empty.txt');

    await assert.rejects(
      async () => probe(fs.createReadStream(file)),
      /unrecognized file format/
    );
  });

  it('should fail on stream errors', async function () {
    async function * generate() {
      throw new Error('stream err');
    }
    await assert.rejects(
      async () => probe(Readable.from(generate())),
      /stream err/
    );
  });


  // Regression test: when processing multiple consecutive large chunks in
  // a single request, probe used to throw "write after error" message.
  //
  // The way this test works is: SVG parser parses spaces up to 64k,
  // and WEBP parser closes immediately after first chunk. Check that it doesn't
  // error out.
  //
  it('should not fail when processing multiple large chunks', async function () {
    let stream = new Readable({
      read: function () {
        // > 16kB (so it will be split), < 64kB (SVG header size)
        this.push(Buffer.alloc(20000, 0x20));
      }
    });

    await assert.rejects(
      async () => probe(stream),
      /unrecognized file format/
    );
  });
});
