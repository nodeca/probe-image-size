'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, str2arr } = require('../../lib/common/utils')
const { Parser } = require('../../lib/formats/tiff')


function parse (...chunks) {
  const parser = new Parser()
  for (const chunk of chunks) parser.push(chunk)
  return parser.getResult()
}


describe('TIFF', function () {
  it('real image', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.tiff')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })


  it('real image, Big Endian', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo_be.tiff')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })


  it('TIFF IFD is first in the file', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'meta_before_image.tiff')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })


  it('bad TIFF IFD', function () {
    // zero entries in 1st ifd, invalid TIFF
    //                     sig     off      count next
    const buf = Buffer.from('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


  it('bad TIFF IFD offset', function () {
    // invalid 1st tiff offset
    //                     sig     off      count next
    const buf = Buffer.from('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


  it('bad TIFF IFD value', function () {
    // invalid ifd type (FF instead of 03 or 04)
    //                     sig     off  count next
    const buf = Buffer.from((
      '49492A00 08000000 0200' + // sig, off, count
      '0001 0000 01000000 FF000000' +
      '0101 0400 01000000 2A000000' +
      '00000000' // next
    ).replace(/ /g, ''), 'hex')

    assert.strictEqual(parse(buf), undefined)
  })


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
        const parser = new Parser()
        parser.push(data.subarray(0, split))
        parser.push(new Uint8Array(0))

        assert.strictEqual(parser.getStatus(), split < data.length ? NEED_MORE : DONE)
        assert.deepStrictEqual(parser.getResult(), split < data.length ? undefined : expected)

        parser.push(data.subarray(split))
        assert.strictEqual(parser.getStatus(), DONE)
        assert.deepStrictEqual(parser.getResult(), expected)
      }

      const parser = new Parser()
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
