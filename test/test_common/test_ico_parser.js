'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE } = require('../../lib/common/utils')
const ico = require('../../lib/common/ico_parser')
const readUInt16LE = require('../../lib/common/read_le_be').readUInt16LE


describe('ICO parser', function () {
  it('should handle every index split and reusable one-byte chunks', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'google1.ico')
    const data = new Uint8Array(fs.readFileSync(file))
    const index_size = 6 + readUInt16LE(data, 4) * 16
    const expected = {
      width: 256,
      height: 256,
      variants: [{ width: 256, height: 256 }, { width: 24, height: 24 }],
      type: 'ico',
      mime: 'image/x-icon',
      wUnits: 'px',
      hUnits: 'px'
    }

    for (let split = 0; split <= index_size; split++) {
      const parser = new ico.Parser()
      parser.push(data.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < index_size ? NEED_MORE : DONE)
      assert.deepStrictEqual(parser.getResult(), split < index_size ? undefined : expected)

      parser.push(data.subarray(split))
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }

    const parser = new ico.Parser()
    const chunk = new Uint8Array(1)
    for (const byte of data.subarray(0, index_size)) {
      chunk[0] = byte
      parser.push(chunk)
      chunk[0] = 0
    }
    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), expected)
  })
})
