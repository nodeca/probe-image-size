'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const str2arr = require('../../lib/common/utils').str2arr
const { Readable } = require('stream')


describe('PNG', function () {
  it('should detect PNG', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.png')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip PNG start pattern without IHDR', async function () {
    const buf = Buffer.from(str2arr('\x89PNG\r\n\x1a\n                  '))

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })
})


describe('PNG (sync)', function () {
  it('should detect PNG', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.png')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'png', mime: 'image/png', wUnits: 'px', hUnits: 'px' })
  })


  it('should skip PNG start pattern without IHDR', function () {
    const size = probe.sync(str2arr('\x89PNG\r\n\x1a\n                  '))

    assert.strictEqual(size, null)
  })
})
