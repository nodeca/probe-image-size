'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, str2arr } = require('../../lib/common/utils')
const { Parser } = require('../../lib/formats/webp')


function parse (...chunks) {
  const parser = new Parser()
  for (const chunk of chunks) parser.push(chunk)
  return parser.getResult()
}


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


const frame_chunks = [
  str2arr('VP8 ' + '\x0A\0\0\0' + '\0\0\0\x9D\x01\x2A\xC0\0\x80\0'),
  str2arr('VP8L' + '\x05\0\0\0' + '\x2F\xBF\xC0\x1F\0' + '\0'),
  str2arr('VP8X' + '\x0A\0\0\0' + '\x08\0\0\0\xBF\0\0\x7F\0\0')
]
const tail = str2arr((
  'JUNK \x01\0\0\0 x \0\0' + // Odd-sized chunk with extra zero padding.
  'EXIF \x1A\0\0\0' +
  '  II \x2A\0 \x08\0\0\0 \x01\0' +
  '  \x12\x01 \x03\0 \x01\0\0\0 \x06\0\0\0' + // Orientation = 6.
  '  \0\0\0\0'
).replace(/ /g, ''))
const images = frame_chunks.map(chunk => {
  const data = new Uint8Array([...str2arr('RIFF\0\0\0\0WEBP'), ...chunk, ...tail])
  new DataView(data.buffer).setUint32(4, data.length - 8, true)
  return data
})
const dimensions = { width: 192, height: 128, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' }
const expected = { ...dimensions, orientation: 6 }


describe('WEBP', function () {
  it('should detect VP8', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8.webp')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 1, height: 1, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip VP8 header with bad code block', function () {
    const buf = Buffer.from(str2arr('RIFF\x20\0\0\0WEBPVP8 \x0C\0\0\0....................'))

    assert.strictEqual(parse(buf), undefined)
  })


  it('should detect VP8X', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8x.webp')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should detect VP8L (lossless)', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'webp-vp8l.webp')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'webp', mime: 'image/webp', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip VP8L header with bad code block', function () {
    const buf = Buffer.from(str2arr('RIFF\x20\0\0\0WEBPVP8L\x0C\0\0\0....................'))

    assert.strictEqual(parse(buf), undefined)
  })


  it('should detect exif orientation', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.webp')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size.orientation, 5)
  })


  it('should finish before the end of a large EXIF chunk', function () {
    const exif_data = Buffer.alloc(4096)
    fixture(`
      49 49 2A 00 ; little-endian TIFF signature
      08 00 00 00 ; IFD0 offset
      01 00 ; IFD0 entry count
      12 01 03 00 01 00 00 00 06 00 00 00 ; Orientation: SHORT, count = 1, value = 6
      00 00 00 00 ; no next IFD
    `).copy(exif_data)
    const data = makeExifWebp(exif_data, 0x40000000)

    const size = parse(data)

    assert.strictEqual(size.width, 10)
    assert.strictEqual(size.height, 10)
    assert.strictEqual(size.orientation, 6)
  })


  it('should continue reading EXIF after the first chunk', function () {
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

    const size = parse(data.subarray(0, 4096), data.subarray(4096))

    assert.strictEqual(size.orientation, 6)
  })


  it('should handle every chunk boundary for VP8, VP8L and VP8X', function () {
    for (const image of images) {
      const orientation_end = image.length - 4

      for (let split = 0; split <= image.length; split++) {
        const parser = new Parser()
        parser.push(image.subarray(0, split))
        parser.push(new Uint8Array(0))

        assert.strictEqual(parser.getStatus(), split < orientation_end ? NEED_MORE : DONE)
        assert.deepStrictEqual(parser.getResult(), split < orientation_end ? undefined : expected)

        parser.push(image.subarray(split))
        assert.strictEqual(parser.getStatus(), DONE)
        assert.deepStrictEqual(parser.getResult(), expected)
      }

      const parser = new Parser()
      const chunk = new Uint8Array(1)
      for (const byte of image) {
        chunk[0] = byte
        parser.push(chunk)
        chunk[0] = 0
      }
      assert.deepStrictEqual(parser.getResult(), expected)
    }
  })

  it('should keep orientation reads inside the EXIF chunk', function () {
    for (const length of [21, 22]) {
      const data = new Uint8Array(images[2])
      const exif_offset = data.length - (8 + 26)
      data[exif_offset + 4] = length
      const parser = new Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), length === 22 ? expected : dimensions)
    }
  })

  it('should stop at the RIFF boundary without reading later chunks', function () {
    const data = new Uint8Array(images[2])
    // End RIFF after its header and the ten-byte VP8X chunk.
    new DataView(data.buffer).setUint32(4, 12 + 8 + 10 - 8, true)
    const parser = new Parser()
    parser.push(data)

    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), dimensions)
  })
})
