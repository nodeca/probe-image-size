'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const { Readable } = require('stream')


describe('TIFF', function () {
  it('real image', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.tiff')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })


  it('real image, Big Endian', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo_be.tiff')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })


  it('TIFF IFD is first in the file', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'meta_before_image.tiff')

    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, { width: 15, height: 15, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })


  it('bad TIFF IFD', async function () {
    // zero entries in 1st ifd, invalid TIFF
    //                     sig     off      count next
    const buf = Buffer.from('49492a00 08000000 0000 00000000'.replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('bad TIFF IFD offset', async function () {
    // invalid 1st tiff offset
    //                     sig     off      count next
    const buf = Buffer.from('49492a00 00000000 0000 00000000'.replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })


  it('bad TIFF IFD value', async function () {
    // invalid ifd type (FF instead of 03 or 04)
    //                     sig     off  count next
    const buf = Buffer.from((
      '49492A00 08000000 0200' + // sig, off, count
      '0001 0000 01000000 FF000000' +
      '0101 0400 01000000 2A000000' +
      '00000000' // next
    ).replace(/ /g, ''), 'hex')

    await assert.rejects(
      async () => probe(Readable.from([buf])),
      /unrecognized file format/
    )
  })
})


describe('TIFF (sync)', function () {
  it('real image', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.tiff')
    const size = probe.sync(new Uint8Array(fs.readFileSync(file)))

    assert.deepStrictEqual(size, { width: 367, height: 187, type: 'tiff', mime: 'image/tiff', wUnits: 'px', hUnits: 'px' })
  })
})
