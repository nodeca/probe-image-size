'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, str2arr } = require('../../lib/common/utils')
const { Parser } = require('../../lib/formats/png')


function parse (...chunks) {
  const parser = new Parser()
  for (const chunk of chunks) parser.push(chunk)
  return parser.getResult()
}


describe('PNG', function () {
  it('should detect PNG', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.png')

    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip PNG start pattern without IHDR', function () {
    const buf = Buffer.from(str2arr('\x89PNG\r\n\x1a\n                  '))

    assert.strictEqual(parse(buf), undefined)
  })


  it('should handle every header split and reusable one-byte chunks', function () {
    const expected = { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' }

    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.png')
    const header = new Uint8Array(fs.readFileSync(file).subarray(0, 24))

    for (let split = 0; split <= header.length; split++) {
      const parser = new Parser()
      parser.push(header.subarray(0, split))
      parser.push(new Uint8Array(0))

      assert.strictEqual(parser.getStatus(), split < header.length ? NEED_MORE : DONE)
      assert.deepStrictEqual(parser.getResult(), split < header.length ? undefined : expected)

      parser.push(header.subarray(split))
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }

    const parser = new Parser()
    const chunk = new Uint8Array(1)
    for (const byte of header) {
      chunk[0] = byte
      parser.push(chunk)
      chunk[0] = 0
    }
    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), expected)
  })
})
