'use strict'


const assert = require('assert')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, FAIL, str2arr } = require('../../lib/common/utils')
const jpeg = require('../../lib/common/jpeg_parser')


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


describe('JPEG parser', function () {
  it('should handle every chunk boundary and finish after SOF dimensions', function () {
    for (let split = 0; split <= image.length; split++) {
      const parser = new jpeg.Parser()
      parser.push(image.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < image.length ? NEED_MORE : DONE)
      assert.deepStrictEqual(parser.getResult(), split < image.length ? undefined : expected)

      parser.push(image.subarray(split))
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }

    const parser = new jpeg.Parser()
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
    const parser = new jpeg.Parser()
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
      const parser = new jpeg.Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), FAIL)
      assert.strictEqual(parser.getResult(), undefined)
    }
  })
})
