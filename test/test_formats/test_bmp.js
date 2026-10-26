'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')


describe('BMP', function () {
  it('should detect BMP', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.bmp')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' })
  })

  it('should detect old (v2) BMP', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo_header_v2.bmp')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' })
  })
})


describe('BMP (sync)', function () {
  it('should detect BMP', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.bmp')
    const size = probe.sync(new Uint8Array(fs.readFileSync(file)))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'bmp', mime: 'image/bmp', wUnits: 'px', hUnits: 'px' })
  })
})
