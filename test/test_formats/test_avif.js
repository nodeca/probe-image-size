'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const probe = require('../../')
const str2arr = require('../../lib/common').str2arr
const { Readable } = require('stream')


describe('AVIF', function () {
  it('should detect AVIF', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.avif')
    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, {
      width: 367,
      height: 187,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px'
    })
  })


  it('should detect AVIF orientation from irot/imir', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Rot3Mir1-1.5x.avif')
    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, {
      width: 192,
      height: 192,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 5
    })
  })


  it('should detect AVIF orientation from Exif', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.avif')
    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, {
      width: 192,
      height: 192,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 5
    })
  })


  it('should detect HEIC - image4.heic', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'image4.heic')
    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, {
      width: 700,
      height: 476,
      type: 'heic',
      mime: 'image/heic',
      wUnits: 'px',
      hUnits: 'px',
      variants: [
        { width: 700, height: 476 },
        { width: 700, height: 476 }
      ],
      orientation: 1
    })
  })


  it('should detect HEIC - MIAF002.heic', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'MIAF002.heic')
    const size = await probe(fs.createReadStream(file))

    assert.deepStrictEqual(size, {
      width: 2048,
      height: 2048,
      type: 'heif',
      mime: 'image/heif',
      wUnits: 'px',
      hUnits: 'px',
      variants: [
        { width: 2048, height: 2048 },
        { width: 160, height: 160 }
      ]
    })
  })


  it('minimal AVIF file', async function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.from(buf)]))

    assert.strictEqual(size.width, 16909060)
  })


  it('minimal AVIF file + transforms', async function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x42 meta \0\0\0\0 ' +
      '\0\0\0\x36 iprp ' +
      '\0\0\0\x2E ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\x09 imir \x00' +
      '\0\0\0\x09 irot \x03'
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.from(buf)]))

    assert.strictEqual(size.orientation, 5)
  })


  it('minimal AVIF file + EXIF', async function () {
    // orientation=5 minimal exif from Exif5-1.5x file
    const exif_data = Buffer.from((
      '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
      '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
      '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
      '00480000 0001').replace(/ /g, ''), 'hex')

    const buf = str2arr((
      // first column is length of the box, indents show hierarchy
      '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x72     meta \0\0\0\0 ' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
      '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
      '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x62' +
      '\0\0\0\x24     iprp ' +
      '  \0\0\0\x1C   ipco ' +
      '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\0       mdat ' +
      '               \0\0\0\x06 Exif \0\0'
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.concat([Buffer.from(buf), exif_data])]))

    assert.strictEqual(size.orientation, 5)
  })


  it('coverage - sig offset more than exif length', async function () {
    // orientation=5 minimal exif from Exif5-1.5x file
    const exif_data = Buffer.from((
      '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
      '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
      '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
      '00480000 0001').replace(/ /g, ''), 'hex')

    const buf = str2arr((
      // first column is length of the box, indents show hierarchy
      '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x72     meta \0\0\0\0 ' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
      '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' + //  vvv - bad data here
      '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x02' +
      '\0\0\0\x24     iprp ' +
      '  \0\0\0\x1C   ipco ' +
      '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\0       mdat ' +
      '               \0\0\0\x06 Exif \0\0'
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.concat([Buffer.from(buf), exif_data])]))

    assert.strictEqual(size.orientation, undefined)
  })


  it('coverage - wrong infe, wrong ref index', async function () {
    // orientation=5 minimal exif from Exif5-1.5x file
    const exif_data = Buffer.from((
      '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
      '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
      '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
      '00480000 0001').replace(/ /g, ''), 'hex')

    const buf = str2arr((
      // first column is length of the box, indents show hierarchy
      '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x72     meta \0\0\0\0 ' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x02' +
      '    \0\0\0\x18 free \0\0\0\0 \0\0\0\0 \0\0\0\0 \0\0\0\0' +
      '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\x01 \0\x46\0\x01 \0\x48\0\x62' +
      '\0\0\0\x24     iprp ' +
      '  \0\0\0\x1C   ipco ' +
      '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\0       mdat ' +
      '               \0\0\0\x06 Exif \0\0'
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.concat([Buffer.from(buf), exif_data])]))

    assert.strictEqual(size.orientation, undefined)
  })


  it('should keep largest size in ispe', async function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x58 meta \0\0\0\0 ' +
      '\0\0\0\x4C iprp ' +
      '\0\0\0\x44 ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x30 \x00\x00\x00\x40' +
      '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x04\x00 \x00\x00\x00\x10' +
      '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x10 \x00\x00\x05\x00'
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.from(buf)]))

    assert.deepStrictEqual(size, {
      width: 16,
      height: 1280,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      variants: [
        { width: 48, height: 64 },
        { width: 1024, height: 16 },
        { width: 16, height: 1280 }
      ]
    })
  })


  it('invalid format (mp4)', async function () {
    const buf = str2arr((
      '\0\0\0\x10 ftyp 3gp5 \0\0\0\0' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )
  })


  it('coverage - invalid box lengths', async function () {
    let buf

    buf = str2arr((
      '\0\0\0\x06 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x06 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x06 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x06 ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x06 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )
  })


  it('coverage - should not look past mdat', async function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x0C mdat \0\0\0\0 ' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    await assert.rejects(
      async () => probe(Readable.from([Buffer.from(buf)])),
      /unrecognized file format/
    )
  })


  it('coverage - other fields', async function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x0C free \0\0\0\0 ' +
      '\0\0\0\x4C meta \0\0\0\0 ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x38 iprp ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x28 ipco ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\x0C free \0\0\0\0 '
    ).replace(/ /g, ''))

    const size = await probe(Readable.from([Buffer.from(buf)]))

    assert.strictEqual(size.width, 16909060)
  })


  it('coverage - mime types', async function () {
    let buf

    buf = str2arr((
      '\0\0\0\x14 ftyp hevc \0\0\0\0 msf1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      (await probe(Readable.from([Buffer.from(buf)]))).mime,
      'image/heic-sequence'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp mif1 \0\0\0\0 avif' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      (await probe(Readable.from([Buffer.from(buf)]))).mime,
      'image/avif'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp msf1 \0\0\0\0 heix' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      (await probe(Readable.from([Buffer.from(buf)]))).mime,
      'image/heif-sequence'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp mif1 \0\0\0\0 heix' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      (await probe(Readable.from([Buffer.from(buf)]))).mime,
      'image/heif'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp mif1 \0\0\0\0 xxxx' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      (await probe(Readable.from([Buffer.from(buf)]))).mime,
      'image/avif'
    )
  })
})


describe('AVIF (sync)', function () {
  it('should detect AVIF', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.avif')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 367,
      height: 187,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px'
    })
  })


  it('should detect AVIF orientation from irot/imir', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Rot3Mir1-1.5x.avif')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 192,
      height: 192,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 5
    })
  })


  it('should detect AVIF orientation from Exif', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.avif')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 192,
      height: 192,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 5
    })
  })


  it('should detect HEIC - image4.heic', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'image4.heic')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 700,
      height: 476,
      type: 'heic',
      mime: 'image/heic',
      wUnits: 'px',
      hUnits: 'px',
      variants: [
        { width: 700, height: 476 },
        { width: 700, height: 476 }
      ],
      orientation: 1
    })
  })


  it('should detect HEIC - MIAF002.heic', async function () {
    const file = path.join(__dirname, '..', 'fixtures', 'MIAF002.heic')
    const size = probe.sync(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 2048,
      height: 2048,
      type: 'heif',
      mime: 'image/heif',
      wUnits: 'px',
      hUnits: 'px',
      variants: [
        { width: 2048, height: 2048 },
        { width: 160, height: 160 }
      ]
    })
  })


  it('minimal AVIF file', function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    const size = probe.sync(buf)

    assert.strictEqual(size.width, 16909060)
  })


  it('minimal AVIF file + transforms', async function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x42 meta \0\0\0\0 ' +
      '\0\0\0\x36 iprp ' +
      '\0\0\0\x2E ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\x09 imir \x00' +
      '\0\0\0\x09 irot \x03'
    ).replace(/ /g, ''))

    const size = probe.sync(buf)

    assert.strictEqual(size.orientation, 5)
  })


  it('minimal AVIF file + EXIF', async function () {
    // orientation=5 minimal exif from Exif5-1.5x file
    const exif_data = Buffer.from((
      '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
      '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
      '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
      '00480000 0001').replace(/ /g, ''), 'hex')

    const buf = str2arr((
      // first column is length of the box, indents show hierarchy
      '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x72     meta \0\0\0\0 ' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
      '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
      '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x62' +
      '\0\0\0\x24     iprp ' +
      '  \0\0\0\x1C   ipco ' +
      '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\0       mdat ' +
      '               \0\0\0\x06 Exif \0\0'
    ).replace(/ /g, ''))

    const size = probe.sync(Buffer.concat([Buffer.from(buf), exif_data]))

    assert.strictEqual(size.orientation, 5)
  })


  it('coverage - sig offset more than exif length', async function () {
    // orientation=5 minimal exif from Exif5-1.5x file
    const exif_data = Buffer.from((
      '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
      '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
      '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
      '00480000 0001').replace(/ /g, ''), 'hex')

    const buf = str2arr((
      // first column is length of the box, indents show hierarchy
      '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x72     meta \0\0\0\0 ' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
      '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' + //  vvv - bad data here
      '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\0 \0\x46\0\x01 \0\x48\0\x02' +
      '\0\0\0\x24     iprp ' +
      '  \0\0\0\x1C   ipco ' +
      '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\0       mdat ' +
      '               \0\0\0\x06 Exif \0\0'
    ).replace(/ /g, ''))

    const size = probe.sync(Buffer.concat([Buffer.from(buf), exif_data]))

    assert.strictEqual(size.orientation, undefined)
  })


  it('coverage - wrong infe, wrong ref index', async function () {
    // orientation=5 minimal exif from Exif5-1.5x file
    const exif_data = Buffer.from((
      '4d4d002a 00000008 00050112 00030000 00010005 0000011a 00050000' +
      '00010000 004a011b 00050000 00010000 00520128 00030000 00010002' +
      '00000213 00030000 00010001 00000000 00000000 00480000 00010000' +
      '00480000 0001').replace(/ /g, ''), 'hex')

    const buf = str2arr((
      // first column is length of the box, indents show hierarchy
      '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x72     meta \0\0\0\0 ' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x02' +
      '    \0\0\0\x18 free \0\0\0\0 \0\0\0\0 \0\0\0\0 \0\0\0\0' +
      '  \0\0\0\x1C   iloc \0\0\0\0 \x22\x2F\0\x01 \0\xAA\0\x01 \0\x46\0\x01 \0\x48\0\x62' +
      '\0\0\0\x24     iprp ' +
      '  \0\0\0\x1C   ipco ' +
      '  \0\0\0\x14   ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\0       mdat ' +
      '               \0\0\0\x06 Exif \0\0'
    ).replace(/ /g, ''))

    const size = probe.sync(Buffer.concat([Buffer.from(buf), exif_data]))

    assert.strictEqual(size.orientation, undefined)
  })


  it('should keep largest size in ispe', function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x58 meta \0\0\0\0 ' +
      '\0\0\0\x4C iprp ' +
      '\0\0\0\x44 ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x30 \x00\x00\x00\x40' +
      '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x04\x00 \x00\x00\x00\x10' +
      '\0\0\0\x14 ispe \0\0\0\0 \x00\x00\x00\x10 \x00\x00\x05\x00'
    ).replace(/ /g, ''))

    const size = probe.sync(buf)

    assert.deepStrictEqual(size, {
      width: 16,
      height: 1280,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      variants: [
        { width: 48, height: 64 },
        { width: 1024, height: 16 },
        { width: 16, height: 1280 }
      ]
    })
  })


  it('invalid format (mp4)', function () {
    const buf = str2arr((
      '\0\0\0\x10 ftyp 3gp5 \0\0\0\0' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)
  })


  it('coverage - invalid box lengths', function () {
    let buf

    buf = str2arr((
      '\0\0\0\x06 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x06 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x06 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x06 ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x06 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)
  })


  it('coverage - should not look past mdat', function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x0C mdat \0\0\0\0 ' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(probe.sync(buf), null)
  })


  it('coverage - other fields', function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x0C free \0\0\0\0 ' +
      '\0\0\0\x4C meta \0\0\0\0 ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x38 iprp ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x28 ipco ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\x0C free \0\0\0\0 '
    ).replace(/ /g, ''))

    const size = probe.sync(buf)

    assert.strictEqual(size.width, 16909060)
  })


  it('coverage - mime types', async function () {
    let buf

    buf = str2arr((
      '\0\0\0\x14 ftyp hevc \0\0\0\0 msf1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      probe.sync(buf).mime,
      'image/heic-sequence'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp mif1 \0\0\0\0 avif' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      probe.sync(buf).mime,
      'image/avif'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp msf1 \0\0\0\0 heix' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      probe.sync(buf).mime,
      'image/heif-sequence'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp mif1 \0\0\0\0 heix' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      probe.sync(buf).mime,
      'image/heif'
    )

    buf = str2arr((
      '\0\0\0\x14 ftyp mif1 \0\0\0\0 xxxx' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      probe.sync(buf).mime,
      'image/avif'
    )
  })
})
