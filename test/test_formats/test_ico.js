'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE } = require('../../lib/common/utils')
const { Parser } = require('../../lib/formats/ico')
const { readUInt16LE } = require('../../lib/common/read_le_be')


function parse (...chunks) {
  const parser = new Parser()
  for (const chunk of chunks) parser.push(chunk)
  return parser.getResult()
}


describe('ICO', function () {
  it('should detect ICO', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'google.ico')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 128,
      height: 128,
      variants: [
        { height: 16, width: 16 },
        { height: 24, width: 24 },
        { height: 32, width: 32 },
        { height: 48, width: 48 },
        { height: 128, width: 128 }
      ],
      type: 'ico',
      mime: 'image/x-icon',
      wUnits: 'px',
      hUnits: 'px'
    })
  })


  it('should display 0 size as 256', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'google1.ico')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 256,
      height: 256,
      variants: [
        { height: 256, width: 256 },
        { height: 24, width: 24 }
      ],
      type: 'ico',
      mime: 'image/x-icon',
      wUnits: 'px',
      hUnits: 'px'
    })
  })


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
      const parser = new Parser()
      parser.push(data.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < index_size ? NEED_MORE : DONE)
      assert.deepStrictEqual(parser.getResult(), split < index_size ? undefined : expected)

      parser.push(data.subarray(split))
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }

    const parser = new Parser()
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
