'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const str2arr = require('../../lib/common').str2arr
const { Readable } = require('stream')


describe('WEBP', function () {
  it('should detect VP8', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8.webp')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip VP8 header with bad code block', async function () {
    const buf = Buffer.from(str2arr('RIFF\x20\0\0\0WEBPVP8 \x0C\0\0\0....................'))

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('should detect VP8X', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8x.webp')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should detect VP8L (lossless)', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8l.webp')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip VP8L header with bad code block', async function () {
    const buf = Buffer.from(str2arr('RIFF\x20\0\0\0WEBPVP8L\x0C\0\0\0....................'))

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('should detect exif orientation', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.webp')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size.orientation, 5)
  })
})


describe('WEBP (sync)', function () {
  it('should detect VP8', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8.webp')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip VP8 header with bad code block', function () {
    const size = probe.sync(str2arr('RIFF\x20\0\0\0WEBPVP8 \x0C\0\0\0....................'))

    assert.strictEqual(size, null)
  })


  it('should detect VP8X', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8x.webp')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should detect VP8L (lossless)', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8l.webp')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should detect exif orientation', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.webp')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size.orientation, 5)
  })


  it('should skip VP8L header with bad code block', function () {
    const size = probe.sync(str2arr('RIFF\x20\0\0\0WEBPVP8L\x0C\0\0\0....................'))

    assert.strictEqual(size, null)
  })


  it('coverage - truncated WEBP', function () {
    let buf

    buf = str2arr('RIFF"\0\0\0WEBPVP8 ')
    assert.strictEqual(probe.sync(buf), null)

    buf = str2arr('RIFF"\0\0\0WEBPVP8L')
    assert.strictEqual(probe.sync(buf), null)

    buf = str2arr('RIFF"\0\0\0WEBPVP8X')
    assert.strictEqual(probe.sync(buf), null)
  })
})
