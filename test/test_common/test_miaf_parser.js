'use strict'


const assert = require('assert')
const { describe, it } = require('node:test')
const miaf = require('../../lib/common/miaf_parser')
const str2arr = require('../../lib/common/utils').str2arr


const image = Buffer.from(str2arr((
  '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
  '\0\0\0\x0C     free \0\0\0\0' +
  '\0\0\0\x7D     meta \0\0\0\0' +
  '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
  '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
  '  \0\0\0\x1E   iloc \0\0\0\0 \x44\0 \0\x01' +
  '    \0\xAA \0\0 \0\x01 \0\0\0\xA5 \0\0\0\x24' +
  '  \0\0\0\x2D   iprp' +
  '    \0\0\0\x25 ipco' +
  '      \0\0\0\x14 ispe \0\0\0\0 \0\0\0\xC0 \0\0\0\x80' +
  '      \0\0\0\x09 irot \x02' + // Orientation = 3 until overridden by EXIF.
  '\0\0\0\x2C     mdat' +
  '  \0\0\0\x06 Exif \0\0' +
  '  MM \0\x2A \0\0\0\x08 \0\x01' +
  '  \x01\x12 \0\x03 \0\0\0\x01 \0\x06\0\0' + // Orientation = 6.
  '  \0\0\0\0'
).replace(/ /g, '')))

const expected = { width: 192, height: 128, type: 'avif', mime: 'image/avif', wUnits: 'px', hUnits: 'px', orientation: 6 }


describe('MIAF parser', function () {
  it('should handle every chunk boundary in buffers and typed arrays', function () {
    for (const data of [image, new Uint8Array(image)]) {
      for (let split = 0; split <= data.length; split++) {
        const parser = new miaf.Parser()
        parser.push(data.subarray(0, split))
        parser.push(new Uint8Array(0))
        parser.push(data.subarray(split))
        assert.strictEqual(parser.getStatus(), miaf.DONE, 'split ' + split)
        assert.deepStrictEqual(parser.getResult(), expected, 'split ' + split)
      }
    }

    const parser = new miaf.Parser()
    const chunk = new Uint8Array(1)
    for (const byte of image) {
      chunk[0] = byte
      parser.push(chunk)
      chunk[0] = 0
    }
    assert.deepStrictEqual(parser.getResult(), expected)
  })

  it('should return completed metadata while waiting for EXIF', function () {
    const meta_end = image.indexOf('mdat') - 4
    const orientation_end = image.length - 4

    for (let end = 0; end <= image.length; end++) {
      const parser = new miaf.Parser()
      parser.push(image.subarray(0, end))

      if (end < meta_end) {
        assert.strictEqual(parser.getResult(), undefined)
      } else {
        assert.deepStrictEqual(parser.getResult(), {
          ...expected, orientation: end < orientation_end ? 3 : 6
        }, 'end ' + end)
      }
      assert.strictEqual(parser.getStatus(), end < orientation_end ? miaf.NEED_MORE : miaf.DONE, 'end ' + end)

      parser.push(image.subarray(end))
      assert.strictEqual(parser.getStatus(), miaf.DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }
  })

  it('should not read an orientation entry past the EXIF item boundary', function () {
    // Four offset bytes, six prefix bytes, eight header bytes, two count bytes and a 12-byte entry.
    for (const length of [31, 32]) {
      const data = Buffer.from(image)
      data.writeUInt32BE(length, data.indexOf('iloc') + 22)
      const parser = new miaf.Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), miaf.DONE)
      assert.deepStrictEqual(parser.getResult(), { ...expected, orientation: length === 32 ? 6 : 3 })
    }
  })

  it('should skip a million empty boxes in one chunk without recursion', function () {
    const free = Buffer.from(str2arr('\0\0\0\x08free'))
    const padding = Buffer.alloc(1000000 * free.length).fill(free)
    const data = Buffer.concat([image.subarray(0, 20), padding, image.subarray(20)])
    const extent_offset = data.indexOf('iloc') + 18
    data.writeUInt32BE(data.readUInt32BE(extent_offset) + padding.length, extent_offset)
    const parser = new miaf.Parser()
    parser.push(data)

    assert.strictEqual(parser.getStatus(), miaf.DONE)
    assert.deepStrictEqual(parser.getResult(), expected)
  })
})
