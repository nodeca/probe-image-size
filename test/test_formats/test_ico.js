'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')


describe('ICO', function () {
  it('should detect ICO', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'google.ico')

    const size = await probe(fs.createReadStream(file))

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


  it('should display 0 size as 256', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'google1.ico')

    const size = await probe(fs.createReadStream(file))

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
})


describe('ICO (sync)', function () {
  it('should detect ICO', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'google.ico')
    const size = probe.sync(fs.readFileSync(file))

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
    const size = probe.sync(fs.readFileSync(file))

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


  it('should skip truncated ICO index', function () {
    const buf = Buffer.from([0, 0, 1, 0, 2, 0, 16, 16])

    assert.strictEqual(probe.sync(buf), null)
  })
})
