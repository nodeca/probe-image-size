'use strict'


const assert = require('assert')
const fs = require('fs')
const path = require('path')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE, str2arr } = require('../../lib/common/utils')
const { Parser } = require('../../lib/formats/avif')


function parse (...chunks) {
  const parser = new Parser()
  for (const chunk of chunks) parser.push(chunk)
  return parser.getResult()
}


const image = Buffer.from(str2arr((
  '\0\0\0\x14     ftyp avif \0\0\0\0 mif1' +
  '\0\0\0\x0C     free \0\0\0\0' +
  '\0\0\0\x7D     meta \0\0\0\0' +
  '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
  '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
  '  \0\0\0\x1E   iloc \0\0\0\0 \x44\0 \0\x01' +
  '    \0\xAA \0\0 \0\x01 \0\0\0\xA5 \0\0\0\x24' +
  '  \0\0\0\x2D   iprp' +
  '    \0\0\0\x25 ipco' +
  '      \0\0\0\x14 ispe \0\0\0\0 \0\0\0\xC0 \0\0\0\x80' +
  '      \0\0\0\x09 irot \x02' + // Orientation = 3 until overridden by EXIF.
  '\0\0\0\x2C     mdat' +
  '  \0\0\0\x06 Exif \0\0' +
  '  MM \0\x2A \0\0\0\x08 \0\x01' +
  '  \x01\x12 \0\x03 \0\0\0\x01 \0\x06\0\0' + // Orientation = 6.
  '  \0\0\0\0'
).replace(/ /g, '')))

const expected = { width: 192, height: 128, type: 'avif', mime: 'image/avif', wUnits: 'px', hUnits: 'px', orientation: 6 }


describe('AVIF', function () {
  it('should detect AVIF', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'iojs_logo.avif')
    const size = parse(fs.readFileSync(file))

    assert.deepStrictEqual(size, {
      width: 367,
      height: 187,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px'
    })
  })


  it('should detect AVIF orientation from irot/imir', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Rot3Mir1-1.5x.avif')
    const size = parse(fs.readFileSync(file))

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


  it('should detect AVIF orientation from Exif', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.avif')
    const size = parse(fs.readFileSync(file))

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


  it('should finish before the end of a large EXIF item', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'Exif5-1.5x.avif')
    const image = fs.readFileSync(file)
    const data = Buffer.concat([image, Buffer.alloc(4096)])
    const iloc_offset = data.indexOf('iloc') - 4
    const iloc_end = iloc_offset + data.readUInt32BE(iloc_offset)
    // EXIF is the last iloc entry in this fixture; its length occupies the last 4 bytes.
    data.writeUInt32BE(0x40000000, iloc_end - 4)

    const size = parse(data)

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


  it('should read EXIF after ftyp and meta spanning multiple reads', function () {
    const padding = Buffer.alloc(8192, 'zzzz')
    const ftyp = Buffer.from(str2arr(('\0\0\0\0 ftyp avif \0\0\0\0 mif1').replace(/ /g, '')))
    ftyp.writeUInt32BE(ftyp.length + padding.length, 0)

    const meta = Buffer.from(str2arr((
      '\0\0\0\0     meta \0\0\0\0' +
      '  \0\0\0\x26   iinf \0\0\0\0 \0\x01' +
      '    \0\0\0\x18 infe \0\0\0\0 \0\xAA\0\0 Exif \0\0\0\0' +
      '  \0\0\0\x1E   iloc \0\0\0\0 \x44\0 \0\x01' +
      '    \0\xAA \0\0 \0\x01 \0\0\0\0 \0\0\0\0' +
      '  \0\0\0\x24   iprp' +
      '    \0\0\0\x1C ipco' +
      '      \0\0\0\x14 ispe \0\0\0\0 \0\0\0\xC0 \0\0\0\x80' +
      '  \0\0\0\0     free'
    ).replace(/ /g, '')))
    meta.writeUInt32BE(meta.length + padding.length, 0)
    meta.writeUInt32BE(8 + padding.length, meta.length - 8)

    const mdat = Buffer.from(str2arr(('\0\0\0\0 mdat').replace(/ /g, '')))
    const exif = Buffer.from(str2arr((
      '\0\0\0\0' + // TIFF header offset within the EXIF item.
      'MM \0\x2A \0\0\0\x08 \0\x01' +
      '\x01\x12 \0\x03 \0\0\0\x01 \0\x06\0\0' + // Orientation = 6.
      '\0\0\0\0'
    ).replace(/ /g, '')))
    mdat.writeUInt32BE(mdat.length + exif.length, 0)
    const exif_offset = ftyp.length + padding.length + meta.length + padding.length + mdat.length
    // The single iloc extent stores an absolute offset and a length.
    meta.writeUInt32BE(exif_offset, meta.indexOf('iloc') + 18)
    meta.writeUInt32BE(exif.length, meta.indexOf('iloc') + 22)

    const size = parse(ftyp, padding, meta, padding, mdat, exif)

    assert.deepStrictEqual(size, {
      width: 192,
      height: 128,
      type: 'avif',
      mime: 'image/avif',
      wUnits: 'px',
      hUnits: 'px',
      orientation: 6
    })
  })


  it('should detect HEIC - image4.heic', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'image4.heic')
    const size = parse(fs.readFileSync(file))

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


  it('should detect HEIC - MIAF002.heic', function () {
    const file = path.join(__dirname, '..', 'fixtures', 'MIAF002.heic')
    const size = parse(fs.readFileSync(file))

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

    const size = parse(Buffer.from(buf))

    assert.strictEqual(size.width, 16909060)
  })


  it('minimal AVIF file + transforms', function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x42 meta \0\0\0\0 ' +
      '\0\0\0\x36 iprp ' +
      '\0\0\0\x2E ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\x09 imir \x00' +
      '\0\0\0\x09 irot \x03'
    ).replace(/ /g, ''))

    const size = parse(Buffer.from(buf))

    assert.strictEqual(size.orientation, 5)
  })


  it('minimal AVIF file + EXIF', function () {
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

    const size = parse(Buffer.concat([Buffer.from(buf), exif_data]))

    assert.strictEqual(size.orientation, 5)
  })


  it('coverage - sig offset more than exif length', function () {
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

    const size = parse(Buffer.concat([Buffer.from(buf), exif_data]))

    assert.strictEqual(size.orientation, undefined)
  })


  it('coverage - wrong infe, wrong ref index', function () {
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

    const size = parse(Buffer.concat([Buffer.from(buf), exif_data]))

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

    const size = parse(Buffer.from(buf))

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

    assert.strictEqual(parse(Buffer.from(buf)), undefined)
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

    assert.strictEqual(parse(Buffer.from(buf)), undefined)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x06 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(parse(Buffer.from(buf)), undefined)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x06 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(parse(Buffer.from(buf)), undefined)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x06 ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(parse(Buffer.from(buf)), undefined)

    buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x06 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(parse(Buffer.from(buf)), undefined)
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

    assert.strictEqual(parse(Buffer.from(buf)), undefined)
  })


  it('coverage - other fields', function () {
    const buf = str2arr((
      '\0\0\0\x14 ftyp avif \0\0\0\0 mif1' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x0C free \0\0\0\0 ' +
      '\0\0\0\x54 meta \0\0\0\0 ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x40 iprp ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x30 ipco ' +
      '\0\0\0\x08 free ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08' +
      '\0\0\0\x0C free \0\0\0\0 '
    ).replace(/ /g, ''))

    const size = parse(Buffer.from(buf))

    assert.strictEqual(size.width, 16909060)
  })


  it('coverage - mime types', function () {
    let buf

    buf = str2arr((
      '\0\0\0\x14 ftyp hevc \0\0\0\0 msf1' +
      '\0\0\0\x30 meta \0\0\0\0 ' +
      '\0\0\0\x24 iprp ' +
      '\0\0\0\x1C ipco ' +
      '\0\0\0\x14 ispe \0\0\0\0 \x01\x02\x03\x04 \x05\x06\x07\x08'
    ).replace(/ /g, ''))

    assert.strictEqual(
      parse(Buffer.from(buf)).mime,
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
      parse(Buffer.from(buf)).mime,
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
      parse(Buffer.from(buf)).mime,
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
      parse(Buffer.from(buf)).mime,
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
      parse(Buffer.from(buf)).mime,
      'image/avif'
    )
  })


  it('should handle every chunk boundary', function () {
    const data = new Uint8Array(image)

    for (let split = 0; split <= data.length; split++) {
      const parser = new Parser()
      parser.push(data.subarray(0, split))
      parser.push(new Uint8Array(0))
      parser.push(data.subarray(split))
      assert.strictEqual(parser.getStatus(), DONE, 'split ' + split)
      assert.deepStrictEqual(parser.getResult(), expected, 'split ' + split)
    }

    const parser = new Parser()
    const chunk = new Uint8Array(1)
    for (const byte of image) {
      chunk[0] = byte
      parser.push(chunk)
      chunk[0] = 0
    }
    assert.deepStrictEqual(parser.getResult(), expected)
  })

  it('should return completed metadata while waiting for EXIF', function () {
    const meta_end = image.indexOf('mdat') - 4
    const orientation_end = image.length - 4

    for (let end = 0; end <= image.length; end++) {
      const parser = new Parser()
      parser.push(image.subarray(0, end))

      if (end < meta_end) {
        assert.strictEqual(parser.getResult(), undefined)
      } else {
        assert.deepStrictEqual(parser.getResult(), {
          ...expected, orientation: end < orientation_end ? 3 : 6
        }, 'end ' + end)
      }
      assert.strictEqual(parser.getStatus(), end < orientation_end ? NEED_MORE : DONE, 'end ' + end)

      parser.push(image.subarray(end))
      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }
  })

  it('should not read an orientation entry past the EXIF item boundary', function () {
    // Four offset bytes, six prefix bytes, eight header bytes, two count bytes and a 12-byte entry.
    for (const length of [31, 32]) {
      const data = Buffer.from(image)
      data.writeUInt32BE(length, data.indexOf('iloc') + 22)
      const parser = new Parser()
      parser.push(data)

      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), { ...expected, orientation: length === 32 ? 6 : 3 })
    }
  })

  it('should skip a million empty boxes in one chunk without recursion', function () {
    const free = Buffer.from(str2arr('\0\0\0\x08free'))
    const padding = Buffer.alloc(1000000 * free.length).fill(free)
    const data = Buffer.concat([image.subarray(0, 20), padding, image.subarray(20)])
    const extent_offset = data.indexOf('iloc') + 18
    data.writeUInt32BE(data.readUInt32BE(extent_offset) + padding.length, extent_offset)
    const parser = new Parser()
    parser.push(data)

    assert.strictEqual(parser.getStatus(), DONE)
    assert.deepStrictEqual(parser.getResult(), expected)
  })
})
