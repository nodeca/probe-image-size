'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const { Readable } = require('stream')


describe('JPEG', function () {
  it('should detect JPEG', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.jpeg')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })


  it('should detect JPEG orientation', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.jpg')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, {
      width: 192,
      height: 192,
      type: 'jpg',
      mime: 'image/jpeg',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 5
    })
  })


  it('should read dimensions after a padded EXIF segment', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.jpg')
    const image = fs.readFileSync(file)
    const tiff_offset = image.indexOf('Exif\0\0') + 6
    const length_offset = tiff_offset - 8
    const app1_length = image.readUInt16BE(length_offset)
    const app1_end = length_offset + app1_length
    // EOI markers inside APP1 must not terminate the image.
    const padding = Buffer.alloc(4096, Buffer.from([0xff, 0xd9]))
    const data = Buffer.concat([
      image.subarray(0, tiff_offset + 8), padding,
      image.subarray(tiff_offset + 8, app1_end), padding,
      image.subarray(app1_end)
    ])
    data.writeUInt16BE(app1_length + 2 * padding.length, length_offset)
    data.writeUInt32LE(8 + padding.length, tiff_offset + 4)

    const size = await probe(Readable.from([data]))

    assert.deepStrictEqual(size, {
      width: 192,
      height: 192,
      type: 'jpg',
      mime: 'image/jpeg',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 5
    })
  })


  // regression test
  it('should not fail on empty JPEG markers', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'empty_comment.jpg')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })


  it('should not fail on bad JPEG', async function () {
    // length of C0 is less than needed (should be 5+ bytes)
    const buf = Buffer.from('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('should skip padding', async function () {
    const buf = Buffer.from('FFD8 FFFFFFFFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex')

    const size = await probe(Readable.from([buf]))

    assert.deepStrictEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip unknown bytes between segments', async function () {
    // not exactly standard, https://github.com/nodeca/probe-image-size/issues/68, `AA`s are extras in fixture
    let buf = Buffer.from('FFD8 FFE00002 AAAAAAAA FFC00011 08000F000F03012200021101031101 FFD9'.replace(/ /g, ''), 'hex')

    const size = await probe(Readable.from([buf]))

    assert.deepStrictEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })

    // but don't allow garbage after first segment
    buf = Buffer.from('FFD8 AAAAAAAA FFE00002 FFC00011 08000F000F03012200021101031101 FFD9'.replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('coverage - EOI before SOI', async function () {
    const buf = Buffer.from('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('coverage - unknown marker', async function () {
    const buf = Buffer.from('FFD8 FF05'.replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('coverage - 0xE1 segment but not exif', async function () {
    const buf = Buffer.from('FFD8 FFE10010AAAAAAAAAAAAAAAAAAAAAAAAAAAA FFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex')

    const size = await probe(Readable.from([buf]))

    assert.strictEqual(size.width, 15)
  })
})


describe('JPEG (sync)', function () {
  it('should detect JPEG', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.jpeg')
    const size = probe.sync(new Uint8Array(fs.readFileSync(file)))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })
})
