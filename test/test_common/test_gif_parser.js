'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const gif = require('../../lib/common/gif_parser')


describe('GIF parser', function () {
  it('should handle every header split and reusable one-byte chunks', function () {
    const expected = { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' }

    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.gif')
    const header = new Uint8Array(fs.readFileSync(file).subarray(0, 10))

    for (let split = 0; split <= header.length; split++) {
      const parser = new gif.Parser()
      parser.push(header.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < header.length ? gif.NEED_MORE : gif.DONE)
      assert.deepStrictEqual(parser.getResult(), split < header.length ? undefined : expected)

      parser.push(header.subarray(split))
      assert.strictEqual(parser.getStatus(), gif.DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }

    const parser = new gif.Parser()
    const chunk = new Uint8Array(1)
    for (const byte of header) {
      chunk[0] = byte
      parser.push(chunk)
      chunk[0] = 0
    }
    assert.strictEqual(parser.getStatus(), gif.DONE)
    assert.deepStrictEqual(parser.getResult(), expected)
  })
})
