'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')


describe('GIF', function () {
  it('should detect GIF', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.gif')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' })
  })
})


describe('GIF (sync)', function () {
  it('should detect GIF', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.gif')
    const size = probe.sync(new Uint8Array(fs.readFileSync(file)))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'gif', mime: 'image/gif', wUnits: 'px', hUnits: 'px' })
  })
})
