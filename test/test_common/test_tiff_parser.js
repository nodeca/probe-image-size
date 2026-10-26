'use strict'


const assert = require('assert')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, str2arr } = require('../../lib/common/utils')
const tiff = require('../../lib/common/tiff_parser')


describe('TIFF parser', function () {
  it('should handle every chunk boundary in both byte orders', function () {
    const images = [
      'II \x2A\0 \x10\0\0\0' +
      '\0\0\0\0 \0\0\0\0' + // Padding before IFD.
      '\x03\0' +
      '  \0\x01   \x03\0 \x01\0\0\0 \x6F\x01\0\0' + // Width: SHORT, 367.
      '  \x01\x01 \x04\0 \x01\0\0\0 \xBB\0\0\0' + // Height: LONG, 187.
      '  \x02\x01 \x03\0 \x01\0\0\0 \x08\0\0\0', // Unused entry after both dimensions.
      'MM \0\x2A \0\0\0\x08' +
      '\0\x03' +
      '  \x01\0   \0\x03 \0\0\0\x01 \x01\x6F\0\0' +
      '  \x01\x01 \0\x04 \0\0\0\x01 \0\0\0\xBB' +
      '  \x01\x02 \0\x03 \0\0\0\x01 \0\x08\0\0'
    ]
    const expected = { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' }

    for (const image of images) {
      const data = new Uint8Array(str2arr(image.replace(/ /g, '')))

      for (let split = 0; split <= data.length; split++) {
        const parser = new tiff.Parser()
        parser.push(data.subarray(0, split))
        parser.push(new Uint8Array(0))

        assert.strictEqual(parser.getStatus(), split < data.length ? NEED_MORE : DONE)
        assert.deepStrictEqual(parser.getResult(), split < data.length ? undefined : expected)

        parser.push(data.subarray(split))
        assert.strictEqual(parser.getStatus(), DONE)
        assert.deepStrictEqual(parser.getResult(), expected)
      }

      const parser = new tiff.Parser()
      const chunk = new Uint8Array(1)
      for (const byte of data) {
        chunk[0] = byte
        parser.push(chunk)
        chunk[0] = 0
      }
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }
  })
})
