'use strict'


const assert = require('assert')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, FAIL, str2arr } = require('../../lib/common/utils')
const ftyp = require('../../lib/common/miaf_ftyp_parser')


describe('MIAF ftyp parser', function () {
  it('should select type and MIME from major and compatible brands', function () {
    const cases = [
      ['avif \0\0\0\0 mif1', 'avif', 'image/avif'],
      ['avis \0\0\0\0 msf1', 'avif', 'image/avif'],
      ['avio \0\0\0\0 miaf', 'avif', 'image/avif'],
      ['heic \0\0\0\0 mif1 avif', 'heic', 'image/heic'],
      ['heix \0\0\0\0 mif1 avis', 'heic', 'image/heic'],
      ['hevc \0\0\0\0 msf1 avif', 'heic', 'image/heic-sequence'],
      ['hevx \0\0\0\0 miaf avis', 'heic', 'image/heic-sequence'],
      ['mif1 \0\0\0\0 heic', 'heif', 'image/heif'],
      ['mif1 \0\0\0\0 heix', 'heif', 'image/heif'],
      ['mif1 \0\0\0\0 hevc', 'heif', 'image/heif'],
      ['mif1 \0\0\0\0 hevx', 'heif', 'image/heif'],
      ['mif1 \0\0\0\0 heis', 'heif', 'image/heif'],
      ['msf1 \0\0\0\0 heic', 'heif', 'image/heif-sequence'],
      ['mif1 \0\0\0\0 msf1 heix', 'heif', 'image/heif-sequence'],
      ['mif1 \0\0\0\0 heic avif', 'avif', 'image/avif'],
      ['mif1 \0\0\0\0 heic avis', 'avif', 'image/avif'],
      ['mif1 \0\0\0\0 heic avio', 'heif', 'image/heif'],
      ['mif1 \0\0\0\0', 'avif', 'image/avif'],
      ['msf1 \0\0\0\0', 'avif', 'image/avif'],
      ['miaf \0\0\0\0', 'avif', 'image/avif'],
      ['zzzz \0\0\0\0 mif1', 'avif', 'image/avif'],
      ['zzzz \0\0\0\0 zzzz', undefined],
      ['avif \0\0\0\0 heic', undefined],
      ['zzzz mif1 heic', undefined],
      ['zzzz heic mif1', 'avif', 'image/avif']
    ]

    for (const [input, type, mime] of cases) {
      const data = str2arr(input.replace(/ /g, ''))
      const parser = new ftyp.Parser(data.length)
      const chunk = new Uint8Array(1)

      for (const byte of data) {
        chunk[0] = byte
        parser.push(chunk)
        chunk[0] = 0
      }

      assert.strictEqual(parser.getStatus(), DONE, input)
      assert.deepStrictEqual(parser.getResult(), type ? { type, mime } : undefined, input)
    }
  })

  it('should handle every chunk boundary', function () {
    const data = str2arr('zzzz heic msf1 heix avif'.replace(/ /g, ''))

    for (let split = 0; split <= data.length; split++) {
      const parser = new ftyp.Parser(data.length)
      parser.push(data.slice(0, split))
      parser.push([])

      if (split < data.length) {
        assert.strictEqual(parser.getStatus(), NEED_MORE, 'split ' + split)
        assert.strictEqual(parser.getResult(), undefined)
      }

      parser.push(data.slice(split))
      assert.strictEqual(parser.getStatus(), DONE, 'split ' + split)
      assert.deepStrictEqual(parser.getResult(), { type: 'avif', mime: 'image/avif' }, 'split ' + split)
    }
  })

  it('should ignore bytes after the declared ftyp size', function () {
    const data = str2arr('mif1 \0\0\0\0 heic'.replace(/ /g, ''))
    const extra = str2arr('avif')
    const parser = new ftyp.Parser(data.length)
    parser.push([...data, ...extra])
    parser.push(extra)

    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), { type: 'heif', mime: 'image/heif' })
  })

  it('should reject sizes with an incomplete header or brand', function () {
    for (const size of [0, 4, 7, 9, 10, 11]) {
      const parser = new ftyp.Parser(size)
      assert.strictEqual(parser.getStatus(), FAIL, 'size ' + size)

      parser.push(str2arr('mif1\0\0\0\0'))
      assert.strictEqual(parser.getStatus(), FAIL)
      assert.strictEqual(parser.getResult(), undefined)
    }
  })

  it('should find image brands after a million distinct unknown brands', function () {
    const brand_count = 1000000
    const header = str2arr('zzzz\0\0\0\0')
    const image_brands = str2arr('mif1heic')
    const parser = new ftyp.Parser(header.length + brand_count * 4 + image_brands.length)
    const chunk = Buffer.alloc(4)
    parser.push(header)

    for (let brand = 0; brand < brand_count; brand++) {
      chunk.writeUInt32BE(brand)
      parser.push(chunk)
    }

    assert.strictEqual(parser.getStatus(), NEED_MORE)
    assert.strictEqual(parser.getResult(), undefined)
    parser.push(image_brands)
    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), { type: 'heif', mime: 'image/heif' })
  })
})
