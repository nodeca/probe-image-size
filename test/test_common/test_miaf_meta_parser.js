'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, FAIL, str2arr } = require('../../lib/common/utils')
const meta = require('../../lib/common/miaf_meta_parser')


const iprp_box = str2arr((
  '\0\0\0\x5E     iprp ' +
  '  \0\0\0\x56   ipco ' +
  '    \0\0\0\x14 ispe \0\0\0\0 \0\0\0\x30 \0\0\0\x40' +
  '    \0\0\0\x14 ispe \0\0\0\0 \0\0\x04\0 \0\0\0\x10' +
  '    \0\0\0\x14 ispe \0\0\0\0 \0\0\0\x10 \0\0\x05\0' +
  '    \0\0\0\x09 imir \0' +
  '    \0\0\0\x09 irot \x03'
).replace(/ /g, ''))

const iinf_box = str2arr((
  '\0\0\0\x3E   iinf \0\0\0\0 \0\x02' +
  '  \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif  \0\0\0\0' +
  '  \0\0\0\x18 infe \0\0\0\0 \0\xAB\0\0 Exifx \0\0\0'
).replace(/ /g, ''))

const iloc_box = str2arr((
  '\0\0\0\x26 iloc \0\0\0\0 \x22\x10 \0\x02' +
  '  \0\xAB \0\0 \x80 \0\x01 \0\x40\0\x21' +
  '  \0\xAA \0\0 \x46 \0\x01 \0\x48\0\x62'
).replace(/ /g, ''))

const expected_result = {
  width: 16,
  height: 1280,
  orientation: 5,
  variants: [{ width: 48, height: 64 }, { width: 1024, height: 16 }, { width: 16, height: 1280 }],
  exif_location: { offset: 142, length: 98 }
}


describe('MIAF meta parser', function () {
  it('should read AVIF and HEIC metadata from reusable one-byte chunks', function () {
    const fixtures = [
      ['iojs_logo.avif', 367, 187, null, [[367, 187]], null],
      ['Rot3Mir1-1.5x.avif', 192, 192, 5, [[192, 192]], null],
      ['Exif5-1.5x.avif', 192, 192, null, [[192, 192]], { offset: 343, length: 100 }],
      ['image4.heic', 700, 476, null, [[700, 476], [700, 476]], { offset: 3856, length: 148 }],
      ['MIAF002.heic', 2048, 2048, null, [[2048, 2048], [160, 160]], null]
    ]

    for (const [name, width, height, orientation, sizes, exif_location] of fixtures) {
      const image = fs.readFileSync(path.join(__dirname, '..', 'fixtures', name))
      const box_offset = image.indexOf('meta') - 4
      const data = image.subarray(box_offset + 8, box_offset + image.readUInt32BE(box_offset))
      const parser = new meta.Parser(data.length)
      const chunk = new Uint8Array(1)

      for (const byte of data) {
        chunk[0] = byte
        parser.push(chunk)
        chunk[0] = 0
      }

      parser.push(chunk)
      assert.strictEqual(parser.getStatus(), DONE, name)
      assert.deepStrictEqual(parser.getResult(), {
        width,
        height,
        orientation,
        variants: sizes.map(([width, height]) => ({ width, height })),
        exif_location
      }, name)
    }
  })

  it('should handle every chunk boundary and either order of iinf and iloc', function () {
    for (const boxes of [[iinf_box, iloc_box], [iloc_box, iinf_box]]) {
      const data = [0, 0, 0, 0, ...boxes[0], ...boxes[1], ...iprp_box]

      for (let split = 0; split <= data.length; split++) {
        const parser = new meta.Parser(data.length)
        parser.push(data.slice(0, split))
        parser.push([])

        if (split < data.length) {
          assert.strictEqual(parser.getStatus(), NEED_MORE, 'split ' + split)
          assert.strictEqual(parser.getResult(), undefined)
        }

        parser.push(data.slice(split))
        assert.strictEqual(parser.getStatus(), DONE, 'split ' + split)
        assert.deepStrictEqual(parser.getResult(), expected_result, 'split ' + split)
      }
    }
  })

  it('should limit the total number of ispe entries to 100 across containers', function () {
    const ispe = '\0\0\0\x14 ispe \0\0\0\0 \0\0\0\xC0 \0\0\0\x80'

    for (const counts of [[100], [101], [50, 50], [50, 51]]) {
      const boxes = counts.map(count => {
        const box = Buffer.from(str2arr((
          '\0\0\0\0 iprp \0\0\0\0 ipco' + ispe.repeat(count)
        ).replace(/ /g, '')))
        box.writeUInt32BE(box.length, 0)
        box.writeUInt32BE(box.length - 8, 8)
        return box
      })
      const parser = new meta.Parser(4 + boxes.reduce((size, box) => size + box.length, 0))
      parser.push([0, 0, 0, 0])
      for (const box of boxes) parser.push(box)

      const over_limit = counts.reduce((sum, count) => sum + count, 0) > 100
      assert.strictEqual(parser.getStatus(), over_limit ? FAIL : DONE)
      assert.strictEqual(parser.variants.length, 100)
      if (over_limit) assert.strictEqual(parser.getResult(), undefined)
    }
  })

  it('should limit the total number of iloc items to 1000 across boxes', function () {
    const item = '\0\0 \0\0 \0\x01 \0\x10\0\x21'

    for (const [counts, status, stored_count] of [
      [[1000], DONE, 1000],
      [[1001], FAIL, 0],
      [[500, 500], DONE, 1000],
      [[500, 501], FAIL, 500]
    ]) {
      let item_id = 0
      const boxes = counts.map(count => {
        const box = Buffer.from(str2arr((
          '\0\0\0\0 iloc \0\0\0\0 \x22\0 \0\0' + item.repeat(count)
        ).replace(/ /g, '')))
        box.writeUInt32BE(box.length, 0)
        box.writeUInt16BE(count, 14)
        for (let offset = 16; offset < box.length; offset += 10) box.writeUInt16BE(++item_id, offset)
        return box
      })
      const parser = new meta.Parser(4 + boxes.reduce((size, box) => size + box.length, 0))
      parser.push([0, 0, 0, 0])
      for (const box of boxes) parser.push(box)

      assert.strictEqual(parser.getStatus(), status)
      assert.strictEqual(Object.keys(parser.item_locations).length, stored_count)
    }
  })

  it('should handle zero-byte and 15-byte iloc fields', function () {
    const locations = [
      [str2arr(('\0\0\0\x16 iloc \0\0\0\0 \0\0 \0\x01 \0\xAA\0\0 \0\x01').replace(/ /g, '')),
        { offset: 0, length: 0 }],
      [str2arr((
        '\0\0\0\x43 iloc \0\0\0\0 \xFF\xF0 \0\x01 \0\xAA\0\0' +
        '\0'.repeat(14) + '\x10 \0\x01' +
        '\0'.repeat(14) + '\x21' +
        '\0'.repeat(14) + '\x30'
      ).replace(/ /g, '')), { offset: 49, length: 48 }]
    ]

    for (const [location, exif_location] of locations) {
      const data = [0, 0, 0, 0, ...iinf_box, ...location, ...iprp_box]
      const parser = new meta.Parser(data.length)
      for (const byte of data) parser.push([byte])

      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), { ...expected_result, exif_location })
    }
  })

  it('should ignore external locations and items with multiple extents', function () {
    const locations = str2arr((
      '\0\0\0\x32 iloc \0\0\0\0 \x22\0 \0\x03' +
      '  \0\xAA \0\x01 \0\x01 \0\x10\0\x21' +
      '  \0\xAB \0\0   \0\x02 \0\x30\0\x40 \0\x50\0\x60' +
      '  \0\xAC \0\0   \0\x01 \0\x8E\0\x62'
    ).replace(/ /g, ''))
    const info = Buffer.from(str2arr((
      '\0\0\0\x23   iinf \0\0\0\0 \0\x01' +
      '  \0\0\0\x15 infe \0\0\0\0 \0\xAA\0\0 Exif \0'
    ).replace(/ /g, '')))

    for (const [item_id, exif_location] of [[0xAA, undefined], [0xAB, undefined], [0xAC, expected_result.exif_location]]) {
      info.writeUInt16BE(item_id, info.indexOf('infe') + 8)
      const data = [0, 0, 0, 0, ...locations, ...info, ...iprp_box]
      const parser = new meta.Parser(data.length)
      parser.push(data)

      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), { ...expected_result, exif_location })
    }
  })

  it('should apply rotations and mirrors in file order', function () {
    for (const [mirror_first, orientations] of [[true, [4, 7, 2, 5]], [false, [4, 5, 2, 7]]]) {
      for (let turns = 0; turns < 4; turns++) {
        const data = Buffer.from([0, 0, 0, 0, ...iprp_box])
        const mirror_offset = data.indexOf('imir') - 4
        const rotation_offset = data.indexOf('irot') - 4
        data[rotation_offset + 8] = turns
        if (!mirror_first) {
          data.write('irot', mirror_offset + 4)
          data[mirror_offset + 8] = turns
          data.write('imir', rotation_offset + 4)
          data[rotation_offset + 8] = 0
        }
        const parser = new meta.Parser(data.length)
        parser.push(data)

        assert.strictEqual(parser.getStatus(), DONE)
        assert.strictEqual(parser.getResult().orientation, orientations[turns])
      }
    }
  })

  it('should finish empty metadata and containers without a size result', function () {
    for (const boxes of ['', '\0\0\0\x08 iprp', '\0\0\0\x0E iinf \0\0\0\0 \0\0']) {
      const data = str2arr(('\0\0\0\0' + boxes).replace(/ /g, ''))
      const parser = new meta.Parser(data.length)
      parser.push(data)

      assert.strictEqual(parser.getStatus(), DONE)
      assert.strictEqual(parser.getResult(), undefined)
    }
  })

  it('should reject invalid box sizes and fields extending past their box', function () {
    const valid = Buffer.from([0, 0, 0, 0, ...iinf_box, ...iloc_box, ...iprp_box])
    const invalid = []
    for (const [type, size] of [
      ['iprp', 7], ['ipco', 0], ['ispe', 1], ['ipco', valid.length],
      ['ispe', 19], ['irot', 8], ['imir', 8], ['iinf', 13], ['iloc', 15]
    ]) {
      const data = Buffer.from(valid)
      data.writeUInt32BE(size, data.indexOf(type) - 4)
      invalid.push(data)
    }
    const bad_extent_count = Buffer.from(valid)
    // First item's extent_count, after its one-byte base_offset.
    bad_extent_count.writeUInt16BE(0xffff, valid.indexOf('iloc') + 17)
    invalid.push(bad_extent_count, Buffer.concat([valid, Buffer.alloc(3)]))

    for (const data of invalid) {
      const parser = new meta.Parser(data.length)
      parser.push(data)
      assert.strictEqual(parser.getStatus(), FAIL)
      assert.strictEqual(parser.getResult(), undefined)

      parser.push(valid)
      assert.strictEqual(parser.getStatus(), FAIL)
    }
  })

  it('should skip large unknown boxes and infe names', function () {
    const padding_size = 0x80000000
    const padding = Buffer.alloc(4096)
    Buffer.from(iprp_box).copy(padding)
    const name_chunk = Buffer.alloc(4096, 0x78) // 'x', with no terminating zero.
    const unknown_box_header = Buffer.from(str2arr(('\0\0\0\0 \0\0\0\0 free').replace(/ /g, '')))
    const item_name_header = Buffer.from(str2arr((
      '\0\0\0\0 \0\0\0\0 iinf \0\0\0\0 \0\x01' +
      '\0\0\0\0 infe \0\0\0\0 \0\xAA\0\0 Exifx'
    ).replace(/ /g, '')))
    const infe_offset = item_name_header.indexOf('infe') - 4
    unknown_box_header.writeUInt32BE(8 + padding_size, 4)
    item_name_header.writeUInt32BE(item_name_header.length - 4 + padding_size, 4)
    item_name_header.writeUInt32BE(item_name_header.length - infe_offset + padding_size, infe_offset)

    for (const [header, chunk] of [[unknown_box_header, padding], [item_name_header, name_chunk]]) {
      const parser = new meta.Parser(header.length + padding_size + iprp_box.length)
      parser.push(header)

      for (let skipped = 0; skipped < padding_size; skipped += chunk.length) parser.push(chunk)

      assert.strictEqual(parser.getStatus(), NEED_MORE)
      assert.deepStrictEqual(parser.variants, [])
      parser.push(iprp_box)
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), { ...expected_result, exif_location: null })
    }
  })
})
