'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const { Readable } = require('stream')


describe('SVG', function () {
  it('should detect SVG', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'sample.svg')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' })
  })

  it('should work with weirdly split chunks', async function () {
    const size = await probe(Readable.from([
      Buffer.from('   '),
      Buffer.from(' <s'),
      Buffer.from('vg width="5" height="5"></svg>')
    ]))

    assert.deepStrictEqual(size, { width: 5, height: 5, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' })
  })

  it('should not parse HTML as SVG', async function () {
    const buf = Buffer.from('<html><body><svg width="5" height="4"></svg></body></html>')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })

  it('should skip BOM', async function () {
    const size = await probe(Readable.from([Buffer.from('\ufeff  <svg width="5" height="4"></svg>')]))

    assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' })
  })

  describe('coverage', function () {
    it('too much data before doctype', async function () {
      await assert.rejects(
        async () => probe(Readable.from([Buffer.alloc(70000, 0x20)])),
        /unrecognized file format/
      )
    })

    it('too much data before svg', async function () {
      await assert.rejects(
        async () => probe(Readable.from([Buffer.from('<svg'), Buffer.alloc(70000, 0x20)])),
        /unrecognized file format/
      )
    })

    it('early termination', async function () {
      await assert.rejects(
        async () => probe(Readable.from([Buffer.from('<svg width="5" height="5"')])),
        /unrecognized file format/
      )
    })
  })
})


describe('SVG (sync)', function () {
  it('should detect SVG', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'sample.svg')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 744.09448819, height: 1052.3622047, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' })
  })

  it('should not parse HTML as SVG', async function () {
    const buf = Buffer.from('<html><body><svg width="5" height="4"></svg></body></html>')

    assert.strictEqual(probe.sync(buf), null)
  })

  it('should skip BOM', async function () {
    const size = probe.sync(Buffer.from('\ufeff  <svg width="5" height="4"></svg>'))

    assert.deepStrictEqual(size, { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' })
  })

  it('should give up on too much data before svg', function () {
    const tag = Buffer.from('<svg width="5" height="4">')

    // just under the limit
    assert.deepStrictEqual(
      probe.sync(Buffer.concat([Buffer.alloc(10000, 0x20), tag])),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )

    assert.strictEqual(probe.sync(Buffer.concat([Buffer.alloc(20000, 0x20), tag])), null)
  })


  describe('coverage', function () {
    it('wrong signature', function () {
      const size = probe.sync(Buffer.from('  <not-really-svg width="1" height="1">'))

      assert.strictEqual(size, null)
    })
  })
})
