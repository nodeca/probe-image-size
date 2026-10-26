'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const png = require('../../lib/common/png_parser')


describe('PNG parser', function () {
  it('should handle every header split and reusable one-byte chunks', function () {
    const expected = { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' }

    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.png')
    const header = new Uint8Array(fs.readFileSync(file).subarray(0, 24))

    for (let split = 0; split <= header.length; split++) {
      const parser = new png.Parser()
      parser.push(header.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < header.length ? png.NEED_MORE : png.DONE)
      assert.deepStrictEqual(parser.getResult(), split < header.length ? undefined : expected)

      parser.push(header.subarray(split))
      assert.strictEqual(parser.getStatus(), png.DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }

    const parser = new png.Parser()
    const chunk = new Uint8Array(1)
    for (const byte of header) {
      chunk[0] = byte
      parser.push(chunk)
      chunk[0] = 0
    }
    assert.strictEqual(parser.getStatus(), png.DONE)
    assert.deepStrictEqual(parser.getResult(), expected)
  })
})
