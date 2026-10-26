'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, FAIL, str2arr } = require('../../lib/common/utils')
const { Parser } = require('../../lib/formats/jpeg')


function parse (...chunks) {
  const parser = new Parser()
  for (const chunk of chunks) parser.push(chunk)
  return parser.getResult()
}


const image = new Uint8Array(str2arr((
  '\xFF\xD8 \xFF\xFE \0\x02' + // SOI and an empty comment.
  '\x01\x02 \xFF\xFF\x01' + // Extra bytes, marker padding and standalone TEM.
  '\xFF\xE1 \0\x24 Exif\0\0' +
  '  MM \0\x2A \0\0\0\x08 \0\x01' +
  '  \x01\x12 \0\x03 \0\0\0\x01 \0\x06\0\0' + // Orientation = 6.
  '  \0\0\0\0 \xFF\xD9' + // EOI inside APP1 must be skipped.
  '\xFF\xC0 \0\x11 \x08 \0\x80 \0\xC0' // Only the dimensions from SOF.
).replace(/ /g, '')))

const expected = { width: 192, height: 128, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px', orientation: 6 }


describe('JPEG', function () {
  it('should detect JPEG', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.jpeg')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })


  it('should detect JPEG orientation', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.jpg')

    const size = parse(fs.readFileSync(file))

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


  it('should read dimensions after a padded EXIF segment', function () {
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

    const size = parse(data)

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
  it('should not fail on empty JPEG markers', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'empty_comment.jpg')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 40, height: 20, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })


  it('should not fail on bad JPEG', function () {
    // length of C0 is less than needed (should be 5+ bytes)
    const buf = Buffer.from('FFD8 FFC0 0004 00112233 FFD9'.replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


  it('should skip padding', function () {
    const buf = Buffer.from('FFD8 FFFFFFFFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex')

    const size = parse(buf)

    assert.deepStrictEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip unknown bytes between segments', function () {
    // not exactly standard, https://github.com/nodeca/probe-image-size/issues/68, `AA`s are extras in fixture
    let buf = Buffer.from('FFD8 FFE00002 AAAAAAAA FFC00011 08000F000F03012200021101031101 FFD9'.replace(/ /g, ''), 'hex')

    const size = parse(buf)

    assert.deepStrictEqual(size, { width: 15, height: 15, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px' })

    // but don't allow garbage after first segment
    buf = Buffer.from('FFD8 AAAAAAAA FFE00002 FFC00011 08000F000F03012200021101031101 FFD9'.replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


  it('coverage - EOI before SOI', function () {
    const buf = Buffer.from('FFD8 FFD0 FFD9'.replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


  it('coverage - unknown marker', function () {
    const buf = Buffer.from('FFD8 FF05'.replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


  it('coverage - 0xE1 segment but not exif', function () {
    const buf = Buffer.from('FFD8 FFE10010AAAAAAAAAAAAAAAAAAAAAAAAAAAA FFC00011 08000F000F03012200021101031101 FFFFD9'.replace(/ /g, ''), 'hex')

    const size = parse(buf)

    assert.strictEqual(size.width, 15)
  })


  it('should handle every chunk boundary and finish after SOF dimensions', function () {
    for (let split = 0; split <= image.length; split++) {
      const parser = new Parser()
      parser.push(image.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < image.length ? NEED_MORE : DONE)
      assert.deepStrictEqual(parser.getResult(), split < image.length ? undefined : expected)

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
  })

  it('should keep EXIF reads inside APP1', function () {
    const length_offset = image.indexOf(0xE1) + 1
    // Six prefix bytes, eight TIFF header bytes, two count bytes and an incomplete entry.
    const app1_length = 2 + 6 + 8 + 2 + 11
    const sof_offset = image.indexOf(0xC0) - 1
    const data = new Uint8Array([
      ...image.subarray(0, length_offset + app1_length),
      ...image.subarray(sof_offset)
    ])
    data[length_offset + 1] = app1_length
    const parser = new Parser()
    parser.push(data)

    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), {
      width: 192, height: 128, type: 'jpg', mime: 'image/jpeg', wUnits: 'px', hUnits: 'px'
    })
  })

  it('should reject segment lengths smaller than the length field', function () {
    for (const length of [0, 1]) {
      const data = new Uint8Array(image)
      data[5] = length
      const parser = new Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), FAIL)
      assert.strictEqual(parser.getResult(), undefined)
    }
  })
})
