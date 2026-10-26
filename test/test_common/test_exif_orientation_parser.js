'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, FAIL } = require('../../lib/common/utils')
const exif = require('../../lib/common/exif_orientation_parser')


function makeExif (entries, big_endian = false, ifd0_offset = 8) {
  const data = Buffer.alloc(ifd0_offset + 2 + entries.length * 12 + 4)
  const writeUInt16 = (value, offset) => big_endian
    ? data.writeUInt16BE(value, offset)
    : data.writeUInt16LE(value, offset)
  const writeUInt32 = (value, offset) => big_endian
    ? data.writeUInt32BE(value, offset)
    : data.writeUInt32LE(value, offset)

  data.write(big_endian ? 'MM\0*' : 'II*\0', 0, 'latin1')
  writeUInt32(ifd0_offset, 4)
  writeUInt16(entries.length, ifd0_offset)

  entries.forEach(([tag, type, component_count, value_or_offset], entry_index) => {
    const entry_offset = ifd0_offset + 2 + entry_index * 12
    writeUInt16(tag, entry_offset)
    writeUInt16(type, entry_offset + 2)
    writeUInt32(component_count, entry_offset + 4)
    if (type === 3 && component_count === 1) writeUInt16(value_or_offset, entry_offset + 8)
    else writeUInt32(value_or_offset, entry_offset + 8)
  })

  return data
}


describe('Exif orientation parser', function () {
  it('should read orientation from a real EXIF fixture', function () {
    const data = fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'test.exif'))
    const parser = new exif.Parser()

    parser.push(data)

    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 6)
  })

  for (const big_endian of [false, true]) {
    describe(big_endian ? 'big endian' : 'little endian', function () {
      it('should read every orientation value', function () {
        for (let value = 1; value <= 8; value++) {
          const parser = new exif.Parser()
          parser.push(makeExif([[0x0112, 3, 1, value]], big_endian))

          assert.strictEqual(parser.getStatus(), DONE)
          assert.strictEqual(parser.orientation, value)
        }
      })

      it('should handle every two-chunk boundary and unsorted entries', function () {
        const data = new Uint8Array(makeExif([
          [0x0132, 2, 4, 0],
          [0x0112, 3, 1, 5]
        ], big_endian, 32))

        for (let split_offset = 0; split_offset <= data.length; split_offset++) {
          const parser = new exif.Parser()
          parser.push(data.subarray(0, split_offset))
          parser.push(new Uint8Array(0))

          if (split_offset < data.length - 4) {
            assert.strictEqual(parser.getStatus(), NEED_MORE, 'split ' + split_offset)
            assert.strictEqual(parser.orientation, 0)
          }

          parser.push(data.subarray(split_offset))

          assert.strictEqual(parser.getStatus(), DONE, 'split ' + split_offset)
          assert.strictEqual(parser.orientation, 5, 'split ' + split_offset)
        }
      })

      it('should handle small chunks without retaining their contents', function () {
        const data = makeExif([
          [0x0132, 2, 4, 0],
          [0x0112, 3, 1, 7]
        ], big_endian, 32)

        for (let chunk_size = 1; chunk_size <= 16; chunk_size++) {
          const parser = new exif.Parser()

          for (let chunk_offset = 0; chunk_offset < data.length; chunk_offset += chunk_size) {
            const chunk = new Uint8Array(data.subarray(chunk_offset, chunk_offset + chunk_size))
            parser.push(chunk)
            chunk.fill(0)
          }

          assert.strictEqual(parser.getStatus(), DONE, 'chunk size ' + chunk_size)
          assert.strictEqual(parser.orientation, 7, 'chunk size ' + chunk_size)
        }
      })
    })
  }

  it('should finish with zero when IFD0 has no orientation', function () {
    for (const entries of [[], [[0x0132, 2, 4, 0]]]) {
      const parser = new exif.Parser()
      const data = makeExif(entries)
      parser.push(data.subarray(0, data.length - 4))

      assert.strictEqual(parser.getStatus(), DONE)
      assert.strictEqual(parser.orientation, 0)
    }
  })

  it('should ignore orientation with the wrong type or count', function () {
    for (const [type, component_count] of [[1, 1], [4, 1], [7, 1], [3, 0], [3, 2], [3, 0xffffffff]]) {
      const parser = new exif.Parser()
      parser.push(makeExif([[0x0112, type, component_count, 6]]))

      assert.strictEqual(parser.getStatus(), DONE)
      assert.strictEqual(parser.orientation, 0)
    }
  })

  it('should ignore orientation values outside 1 through 8', function () {
    for (const value of [0, 9, 0xffff]) {
      const parser = new exif.Parser()
      parser.push(makeExif([[0x0112, 3, 1, value]]))

      assert.strictEqual(parser.getStatus(), DONE)
      assert.strictEqual(parser.orientation, 0)
    }
  })

  it('should ignore component counts and offsets of unrelated tags', function () {
    const parser = new exif.Parser()
    parser.push(makeExif([
      [0x0100, 1, 0xffffffff, 0xffffffff],
      [0x0132, 2, 0xffffffff, 0xffffffff],
      [0x0112, 3, 1, 6]
    ]))

    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 6)
  })

  it('should skip a distant IFD0 and ignore orientation-like bytes in the gap', function () {
    const data = makeExif([[0x0112, 3, 1, 6]])
    const padding_length = 1024 * 1024
    data.writeUInt32LE(8 + padding_length, 4)

    const padding_chunk = Buffer.alloc(65536)
    makeExif([[0x0112, 3, 1, 8]]).copy(padding_chunk)
    const parser = new exif.Parser()
    parser.push(data.subarray(0, 8))

    for (let skipped_bytes = 0; skipped_bytes < padding_length; skipped_bytes += padding_chunk.length) {
      parser.push(padding_chunk)
    }

    assert.strictEqual(parser.getStatus(), NEED_MORE)
    parser.push(data.subarray(8))
    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 6)
  })

  it('should accept an IFD0 offset with the high bit set', function () {
    const data = makeExif([])
    data.writeUInt32LE(0xffffffff, 4)
    const parser = new exif.Parser()

    parser.push(data)

    assert.strictEqual(parser.getStatus(), NEED_MORE)
    assert.strictEqual(parser.orientation, 0)
  })

  it('should scan up to the last entry of a full IFD0', function () {
    const entries = Array.from({ length: 65535 }, () => [0x8769, 4, 1, 8])
    entries[entries.length - 1] = [0x0112, 3, 1, 6]
    const parser = new exif.Parser()

    parser.push(makeExif(entries))

    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 6)
  })

  it('should ignore sub-IFD fan-out back to IFD0', function () {
    const entries = Array.from({ length: 100 }, (_, entry_index) => [entry_index < 50 ? 0x8769 : 0xA005, 4, 1, 8])
    const parser = new exif.Parser()

    parser.push(makeExif(entries))

    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 0)
  })

  it('should ignore orientation in other IFDs', function () {
    for (const tag of [0x8769, 0x8825, 0x0100]) {
      const exif_data = makeExif([[tag, 4, 1, 26]])
      // The plain tag case reaches the other IFD through the next-IFD pointer.
      if (tag === 0x0100) exif_data.writeUInt32LE(26, exif_data.length - 4)
      const other_ifd = makeExif([[0x0112, 3, 1, 8]]).subarray(8)
      const parser = new exif.Parser()

      parser.push(Buffer.concat([exif_data, other_ifd]))

      assert.strictEqual(parser.getStatus(), DONE)
      assert.strictEqual(parser.orientation, 0)
    }
  })

  it('should finish with zero for a null IFD0 pointer', function () {
    const parser = new exif.Parser()
    parser.push(Buffer.from('49492a0000000000', 'hex'))

    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 0)
  })

  it('should reject invalid TIFF signatures', function () {
    for (const signature of ['00000000', '4949002a', '4d4d2a00', '49492b00']) {
      const parser = new exif.Parser()
      parser.push(Buffer.from(signature + '08000000', 'hex'))

      assert.strictEqual(parser.getStatus(), FAIL)
      assert.strictEqual(parser.orientation, 0)
    }
  })

  it('should reject IFD0 offsets inside the TIFF header', function () {
    for (let ifd0_offset = 1; ifd0_offset < 8; ifd0_offset++) {
      const data = makeExif([])
      data.writeUInt32LE(ifd0_offset, 4)
      const parser = new exif.Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), FAIL)
      assert.strictEqual(parser.orientation, 0)
    }
  })

  it('should stop at the first valid orientation and ignore later input', function () {
    const data = makeExif([[0x0112, 3, 1, 5], [0x0112, 3, 1, 8]])
    const parser = new exif.Parser()
    parser.push(data.subarray(0, 22))

    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 5)

    parser.push(data.subarray(22))
    parser.push(Buffer.alloc(8))
    assert.strictEqual(parser.getStatus(), DONE)
    assert.strictEqual(parser.orientation, 5)
  })

  it('should ignore later input after a failure', function () {
    const parser = new exif.Parser()
    parser.push(Buffer.alloc(8))
    parser.push(makeExif([[0x0112, 3, 1, 6]]))

    assert.strictEqual(parser.getStatus(), FAIL)
    assert.strictEqual(parser.orientation, 0)
  })
})
