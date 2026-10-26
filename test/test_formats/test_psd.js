'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')


describe('PSD', function () {
  it('should detect PSD', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'empty.psd')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' })
  })
})


describe('PSD (sync)', function () {
  it('should detect PSD', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'empty.psd')
    const size = probe.sync(new Uint8Array(fs.readFileSync(file)))

    assert.deepStrictEqual(size, { width: 640, height: 400, type: 'psd', mime: 'image/vnd.adobe.photoshop', wUnits: 'px', hUnits: 'px' })
  })
})
