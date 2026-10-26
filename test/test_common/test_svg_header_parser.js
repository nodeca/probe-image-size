'use strict'


const assert = require('assert')
const { describe, it } = require('node:test')
const { NEED_MORE, DONE } = require('../../lib/common/utils')
const svgHeader = require('../../lib/common/svg_header_parser')
const parseSync = require('../../lib/parse_sync/svg')
const parseSvgHeader = str => parseSync(Buffer.from(str))


describe('svg header parser', function () {
  it('should extract width info from viewbox', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg viewbox="0 0 800 600"></svg>'),
      { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should extract width info from camel cased viewBox', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg viewBox="0 0 800 600"></svg>'),
      { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should return width/height units', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg width="5in" height="4pt"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' }
    )
  })

  it('should ignore stroke-width', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg stroke-width="2" width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should not parse HTML as SVG', function () {
    assert.strictEqual(
      parseSvgHeader('<html><body><svg width="5" height="4"></svg></body></html>'),
      undefined
    )
  })

  it('should skip initial comments and directives', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<?xml version="1.0"?><!-- comment --><svg width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should allow SVG namespace', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<aaa:svg xmlns:aaa="http://www.w3.org/2000/svg" width="5" height="4"></aaa:svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should skip doctype', function () {
    const expected = { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }

    assert.deepStrictEqual(
      parseSvgHeader('<!DOCTYPE svg><svg width="5" height="4"></svg>'),
      expected
    )

    assert.deepStrictEqual(
      parseSvgHeader('<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ' +
        '"http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg width="5" height="4"></svg>'),
      expected
    )

    // doctype with an internal subset, `>` inside must not end it
    assert.deepStrictEqual(
      parseSvgHeader('<!DOCTYPE svg [<!ENTITY foo "bar">]><svg width="5" height="4"></svg>'),
      expected
    )
  })

  it('should skip brackets and quotes inside doctype', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<!DOCTYPE svg PUBLIC "a[b>c" \'d"e\' [\n' +
        '<!ENTITY a "x]y>z">\n' +
        '<!-- ] > \' -->\n' +
        '<?pi ] > " ?>\n' +
        ']><svg width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should give the same result for any chunking', function () {
    const buf = Buffer.from('\ufeff<?xml version="1.0"?><!-- a-b -- > --><!DOCTYPE svg [<!ENTITY a "x]y>z" \'q\'> <?pi ?? ?>]>' +
      '<aaa:svg data-x="a>b" width=\'5\' height=40 viewBox="0 0 10 80"/>')
    const expected = parseSync(buf)

    assert.ok(expected)

    for (let size = 1; size <= 5; size++) {
      const parser = new svgHeader.Parser()

      for (let i = 0; i < buf.length && parser.getStatus() === NEED_MORE; i += size) {
        parser.push(buf.subarray(i, i + size))
      }

      assert.strictEqual(parser.getStatus(), DONE)
      assert.deepStrictEqual(parser.getResult(), expected)
    }
  })

  it('should skip tags inside comments', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<!-- <div> --><svg width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should allow > inside attribute values', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg data-foo="a>b" width="5" height="4"></svg>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should accept unquoted attribute values', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg width=5 height=4>'),
      { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should accept comma and whitespace separators in viewbox', function () {
    const expected = { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }

    assert.deepStrictEqual(parseSvgHeader('<svg viewbox="0,0,800,600">'), expected)
    assert.deepStrictEqual(parseSvgHeader('<svg viewbox="0  0  800  600">'), expected)
    assert.deepStrictEqual(parseSvgHeader('<svg viewbox="0 0 800\n600">'), expected)
    assert.deepStrictEqual(parseSvgHeader('<svg viewbox=" 0 0 800 600 ">'), expected)
  })

  it('should ignore suffixed attributes', function () {
    const expected = { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }

    assert.deepStrictEqual(parseSvgHeader('<svg data-height="1" viewbox="0 0 800 600">'), expected)
    assert.deepStrictEqual(parseSvgHeader('<svg stroke-height="1" viewbox="0 0 800 600">'), expected)
  })

  it('should not read size out of other attribute values', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg data-foo=\'width="1" height="2"\' viewbox="0 0 800 600">'),
      { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  it('should reject invalid namespace prefix', function () {
    assert.strictEqual(parseSvgHeader('<9:.-:svg width="5" height="4"></svg>'), undefined)
  })

  it('should fall back to viewbox on percentage width/height', function () {
    assert.deepStrictEqual(
      parseSvgHeader('<svg width="100%" height="100%" viewbox="0 0 800 600">'),
      { width: 800, height: 600, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
    )
  })

  describe('coverage', function () {
    it('single quotes (width/height)', function () {
      assert.deepStrictEqual(
        parseSvgHeader("<svg width='5in' height='4pt'></svg>"),
        { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'pt' }
      )
    })

    it('single quotes (viewbox)', function () {
      assert.deepStrictEqual(
        parseSvgHeader("<svg width='1in' viewbox='0 0 100 50'>"),
        { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' }
      )
    })

    it('width, no height', function () {
      assert.deepStrictEqual(
        parseSvgHeader('<svg width="1in" viewbox="0 0 100 50">'),
        { width: 1, height: 0.5, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' }
      )
    })

    it('height, no width', function () {
      assert.deepStrictEqual(
        parseSvgHeader('<svg height="1in" viewbox="0 0 100 50">'),
        { width: 2, height: 1, type: 'svg', mime: 'image/svg+xml', wUnits: 'in', hUnits: 'in' }
      )
    })

    it('width is invalid, no height', function () {
      assert.strictEqual(parseSvgHeader('<svg width="-1" viewbox="0 0 100 50">'), undefined)
    })

    it('height is invalid, no width', function () {
      assert.strictEqual(parseSvgHeader('<svg height="foobar" viewbox="0 0 100 50">'), undefined)
    })

    it('width is invalid (non positive)', function () {
      assert.strictEqual(parseSvgHeader('<svg width="0" height="5">'), undefined)
    })

    it('width is invalid (Infinity)', function () {
      assert.strictEqual(parseSvgHeader('<svg width="Infinity" height="5">'), undefined)
    })

    it('no viewbox, no height', function () {
      assert.strictEqual(parseSvgHeader('<svg width="5">'), undefined)
    })

    it('viewbox units are different', function () {
      assert.strictEqual(parseSvgHeader('<svg width="5" viewbox="0 0 5px 3in">'), undefined)
    })

    it('unclosed tag', function () {
      assert.strictEqual(parseSvgHeader('<svg width="5" height="5"'), undefined)
    })

    it('malformed markup', function () {
      assert.strictEqual(parseSvgHeader('<![CDATA[ ]]><svg width="5" height="5">'), undefined)
      assert.strictEqual(parseSvgHeader('<!-x --><svg width="5" height="5">'), undefined)
      assert.strictEqual(parseSvgHeader('<!DOCTYPE svg [<x>]><svg width="5" height="5">'), undefined)
      assert.strictEqual(parseSvgHeader('<!DOCTYPE svg [<!1>]><svg width="5" height="5">'), undefined)
      assert.strictEqual(parseSvgHeader('<!DOCTYPE svg [<!-x>]><svg width="5" height="5">'), undefined)
      assert.strictEqual(parseSvgHeader('<svg width="5" height="5" @>'), undefined)
      assert.strictEqual(parseSvgHeader('<svg width=>'), undefined)
      assert.strictEqual(parseSvgHeader('<svg width="5"height="4">'), undefined)
      assert.strictEqual(parseSvgHeader('<svg/x>'), undefined)
      assert.strictEqual(parseSync(Buffer.from([0xEF, 0x3C])), undefined)
      assert.strictEqual(parseSync(Buffer.from([0xEF, 0xBB, 0x3C])), undefined)
    })

    it('attribute without value', function () {
      assert.deepStrictEqual(
        parseSvgHeader('<svg foo width="5" height="4">'),
        { width: 5, height: 4, type: 'svg', mime: 'image/svg+xml', wUnits: 'px', hUnits: 'px' }
      )
    })
  })
})
