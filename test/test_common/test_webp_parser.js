'use strict'


const assert = require('assert')
const { describe, it } = require('node:test')
const webp = require('../../lib/common/webp_parser')
const str2arr = require('../../lib/common/utils').str2arr


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


describe('WebP parser', function () {
  it('should handle every chunk boundary for VP8, VP8L and VP8X', function () {
    for (const image of images) {
      const orientation_end = image.length - 4

      for (let split = 0; split <= image.length; split++) {
        const parser = new webp.Parser()
        parser.push(image.subarray(0, split))
        parser.push(new Uint8Array(0))

        assert.strictEqual(parser.getStatus(), split < orientation_end ? webp.NEED_MORE : webp.DONE)
        assert.deepStrictEqual(parser.getResult(), split < orientation_end ? undefined : expected)

        parser.push(image.subarray(split))
        assert.strictEqual(parser.getStatus(), webp.DONE)
        assert.deepStrictEqual(parser.getResult(), expected)
      }

      const parser = new webp.Parser()
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
      const parser = new webp.Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), webp.DONE)
      assert.deepStrictEqual(parser.getResult(), length === 22 ? expected : dimensions)
    }
  })

  it('should stop at the RIFF boundary without reading later chunks', function () {
    const data = new Uint8Array(images[2])
    // End RIFF after its header and the ten-byte VP8X chunk.
    new DataView(data.buffer).setUint32(4, 12 + 8 + 10 - 8, true)
    const parser = new webp.Parser()
    parser.push(data)

    assert.strictEqual(parser.getStatus(), webp.DONE)
    assert.deepStrictEqual(parser.getResult(), dimensions)
  })
})
