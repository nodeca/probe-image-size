'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const str2arr = require('../../lib/common/utils').str2arr
const { Readable } = require('stream')


function fixture (s) {
  return Buffer.from(
    s.replace(/;.*/mg, '')
      .match(/[0-9a-f]{2}/gi)
      .map(i => parseInt(i, 16))
  )
}


function makeExifWebp (exif_data, exif_length = exif_data.length) {
  const padding = Buffer.alloc(exif_length % 2)
  const header = Buffer.alloc(38)
  header.write('RIFF', 0)
  header.writeUInt32LE(30 + exif_length + padding.length, 4)
  header.write('WEBPVP8X', 8)
  header.writeUInt32LE(10, 16)
  header[20] = 8 // EXIF flag
  header[24] = 9 // width - 1
  header[27] = 9 // height - 1
  header.write('EXIF', 30)
  header.writeUInt32LE(exif_length, 34)

  return Buffer.concat([header, exif_data, padding])
}


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


  it('should finish before the end of a large EXIF chunk', async function () {
    const exif_data = Buffer.alloc(4096)
    fixture(`
      49 49 2A 00 ; little-endian TIFF signature
      08 00 00 00 ; IFD0 offset
      01 00 ; IFD0 entry count
      12 01 03 00 01 00 00 00 06 00 00 00 ; Orientation: SHORT, count = 1, value = 6
      00 00 00 00 ; no next IFD
    `).copy(exif_data)
    const data = makeExifWebp(exif_data, 0x40000000)

    const size = await probe(Readable.from([data]))

    assert.strictEqual(size.width, 10)
    assert.strictEqual(size.height, 10)
    assert.strictEqual(size.orientation, 6)
  })


  it('should continue reading EXIF after the first chunk', async function () {
    const ifd0_offset = 4096
    const exif_data = Buffer.alloc(ifd0_offset + 18)
    exif_data.write('II*\0', 0, 'latin1')
    exif_data.writeUInt32LE(ifd0_offset, 4)
    exif_data.writeUInt16LE(1, ifd0_offset)
    exif_data.writeUInt16LE(0x0112, ifd0_offset + 2)
    exif_data.writeUInt16LE(3, ifd0_offset + 4)
    exif_data.writeUInt32LE(1, ifd0_offset + 6)
    exif_data.writeUInt16LE(6, ifd0_offset + 10)
    const data = makeExifWebp(exif_data)

    const size = await probe(Readable.from([data.subarray(0, 4096), data.subarray(4096)]))

    assert.strictEqual(size.orientation, 6)
  })
})


describe('WEBP (sync)', function () {
  it('should detect VP8', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8.webp')
    const size = probe.sync(new Uint8Array(fs.readFileSync(file)))

    assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })
})
