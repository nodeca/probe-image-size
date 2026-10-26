'use strict'


var NEED_MORE = require('../common/utils').NEED_MORE
var DONE = require('../common/utils').DONE
var FAIL = require('../common/utils').FAIL


// Parse the XML prolog and the root element of an SVG document.

// max size for pre-svg-tag comments plus svg tag itself
exports.MAX_DATA_LENGTH = 1024 * 10


// prolog ::= XMLDecl? Misc* (doctypedecl Misc*)?, Misc ::= Comment | PI | S
var S_TOP = 0
var S_BOM1 = 1
var S_BOM2 = 2
var S_TOP_LT = 3 // <
var S_TOP_LT_BANG = 4 // <!
var S_TOP_LT_BANG_DASH = 5 // <!-
var S_PI = 6 // <? ... ?>
var S_PI_END = 7 // <? ... ?
var S_COMMENT = 8 // <!-- ... -->
var S_COMMENT_DASH = 9 // <!-- ... -
var S_COMMENT_DASH2 = 10 // <!-- ... --
var S_DOCTYPE = 11 // <!DOCTYPE ... >
var S_SUBSET = 12 // <!DOCTYPE ... [ ... ]
var S_SUBSET_LT = 13 // [ ... <
var S_SUBSET_LT_BANG = 14 // [ ... <!
var S_SUBSET_LT_BANG_DASH = 15 // [ ... <!-
var S_DECL = 16 // <!ENTITY ... >
var S_DQUOTE = 17 // " ... "
var S_SQUOTE = 18 // ' ... '
var S_TAG_NAME = 19 // <svg
var S_TAG = 20 // <svg ... >
var S_TAG_SLASH = 21 // <svg ... />
var S_ATTR_NAME = 22
var S_ATTR_EQ = 23
var S_ATTR_VALUE = 24 // name=
var S_VALUE_DQUOTE = 25 // name=" ... "
var S_VALUE_SQUOTE = 26 // name=' ... '
var S_VALUE_UNQUOTED = 27
var S_VALUE_END = 28


function isSpace (c) {
  return c === 0x20 || c === 0x09 || c === 0x0A || c === 0x0D
}

function isLetter (c) {
  return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)
}

function isNameStart (c) {
  return isLetter(c) || c === 0x5F /* _ */ || c === 0x3A /* : */
}

function isNameChar (c) {
  return isNameStart(c) || (c >= 0x30 && c <= 0x39) || c === 0x2E /* . */ || c === 0x2D /* - */
}

function isUnquoted (c) {
  return c > 0x20 &&
    c !== 0x22 /* " */ && c !== 0x27 /* ' */ && c !== 0x3D /* = */ &&
    c !== 0x3C /* < */ && c !== 0x3E /* > */ && c !== 0x60 /* ` */
}


function toStr (buf, start, end) {
  var str = ''

  for (var i = start; i < end; i++) str += String.fromCharCode(buf[i])

  return str
}


function SvgHeaderParser () {
  this.buf = new Uint8Array(exports.MAX_DATA_LENGTH)
  this.len = 0
  this.pos = 0
  this.start = 0
  this.state = S_TOP
  this.state_stack = []
  this.status = NEED_MORE
  this.attrName = ''
  this.attrs = Object.create(null)
}


SvgHeaderParser.prototype.push = function (data) {
  var buf = this.buf
  var state = this.state
  var state_stack = this.state_stack
  var len = this.len
  var pos = this.pos
  var bytes_to_copy = Math.min(data.length, buf.length - len)
  var c, name

  // 1. We can't rely on buffer features
  // 2. Don't care about UTF16 because ascii is enougth for our goals
  for (var i = 0; i < bytes_to_copy; i++) buf[len + i] = data[i]

  len += bytes_to_copy
  this.len = len

  while (this.status === NEED_MORE && pos < len) {
    c = buf[pos]

    switch (state) {
      case S_TOP:
        if (c === 0x3C /* < */) {
          state_stack.push(state)
          state = S_TOP_LT
        } else if (c === 0xEF && pos === 0) {
          // Skip byte order mark, https://github.com/nodeca/probe-image-size/issues/57
          state_stack.push(state)
          state = S_BOM1
        } else if (!isSpace(c)) {
          this.status = FAIL
        }
        break

      case S_BOM1:
        if (c === 0xBB) state = S_BOM2
        else this.status = FAIL
        break

      case S_BOM2:
        if (c === 0xBF) state = state_stack.pop()
        else this.status = FAIL
        break

      case S_TOP_LT:
        if (c === 0x3F /* ? */) {
          state = S_PI
        } else if (c === 0x21 /* ! */) {
          state = S_TOP_LT_BANG
        } else if (isNameStart(c)) {
          state = S_TAG_NAME
          this.start = pos
        } else {
          this.status = FAIL
        }
        break

      case S_TOP_LT_BANG:
        if (c === 0x2D /* - */) state = S_TOP_LT_BANG_DASH
        else if (isLetter(c)) state = S_DOCTYPE
        else this.status = FAIL
        break

      case S_TOP_LT_BANG_DASH:
        if (c === 0x2D /* - */) state = S_COMMENT
        else this.status = FAIL
        break

      case S_PI:
        if (c === 0x3F /* ? */) state = S_PI_END
        break

      case S_PI_END:
        if (c === 0x3E /* > */) state = state_stack.pop()
        else if (c !== 0x3F /* ? */) state = S_PI
        break

      case S_COMMENT:
        if (c === 0x2D /* - */) state = S_COMMENT_DASH
        break

      case S_COMMENT_DASH:
        state = c === 0x2D /* - */ ? S_COMMENT_DASH2 : S_COMMENT
        break

      case S_COMMENT_DASH2:
        if (c === 0x3E /* > */) state = state_stack.pop()
        else if (c !== 0x2D /* - */) state = S_COMMENT
        break

      case S_DOCTYPE:
        if (c === 0x22 /* " */) {
          state_stack.push(state)
          state = S_DQUOTE
        } else if (c === 0x27 /* ' */) {
          state_stack.push(state)
          state = S_SQUOTE
        } else if (c === 0x5B /* [ */) {
          state_stack.push(state)
          state = S_SUBSET
        } else if (c === 0x3E /* > */) {
          state = state_stack.pop()
        }
        break

      case S_SUBSET:
        if (c === 0x5D /* ] */) {
          state = state_stack.pop()
        } else if (c === 0x3C /* < */) {
          state_stack.push(state)
          state = S_SUBSET_LT
        }
        break

      case S_SUBSET_LT:
        if (c === 0x3F /* ? */) state = S_PI
        else if (c === 0x21 /* ! */) state = S_SUBSET_LT_BANG
        else this.status = FAIL
        break

      case S_SUBSET_LT_BANG:
        if (c === 0x2D /* - */) state = S_SUBSET_LT_BANG_DASH
        else if (isLetter(c)) state = S_DECL
        else this.status = FAIL
        break

      case S_SUBSET_LT_BANG_DASH:
        if (c === 0x2D /* - */) state = S_COMMENT
        else this.status = FAIL
        break

      case S_DECL:
        if (c === 0x22 /* " */) {
          state_stack.push(state)
          state = S_DQUOTE
        } else if (c === 0x27 /* ' */) {
          state_stack.push(state)
          state = S_SQUOTE
        } else if (c === 0x3E /* > */) {
          state = state_stack.pop()
        }
        break

      case S_DQUOTE:
        if (c === 0x22 /* " */) state = state_stack.pop()
        break

      case S_SQUOTE:
        if (c === 0x27 /* ' */) state = state_stack.pop()
        break

      case S_TAG_NAME:
        if (isNameChar(c)) break

        name = toStr(buf, this.start, pos)

        // top level element must be svg (with optional namespace prefix),
        // used to skip svg embedded in html
        if (name !== 'svg' && name.slice(-4) !== ':svg') {
          this.status = FAIL
          break
        }

        state = S_TAG
        continue

      case S_TAG:
        if (c === 0x3E /* > */) {
          this.status = DONE
        } else if (c === 0x2F /* / */) {
          state = S_TAG_SLASH
        } else if (isNameStart(c)) {
          state = S_ATTR_NAME
          this.start = pos
        } else if (!isSpace(c)) {
          this.status = FAIL
        }
        break

      case S_TAG_SLASH:
        this.status = c === 0x3E /* > */ ? DONE : FAIL
        break

      case S_ATTR_NAME:
        if (isNameChar(c)) break

        this.attrName = toStr(buf, this.start, pos)
        state = S_ATTR_EQ
        continue

      case S_ATTR_EQ:
        if (isSpace(c)) break

        if (c === 0x3D /* = */) {
          state = S_ATTR_VALUE
          break
        }

        this.attrs[this.attrName] = ''
        state = S_TAG
        continue

      case S_ATTR_VALUE:
        if (c === 0x22 /* " */) {
          state = S_VALUE_DQUOTE
          this.start = pos + 1
        } else if (c === 0x27 /* ' */) {
          state = S_VALUE_SQUOTE
          this.start = pos + 1
        } else if (isUnquoted(c)) {
          state = S_VALUE_UNQUOTED
          this.start = pos
        } else if (!isSpace(c)) {
          this.status = FAIL
        }
        break

      case S_VALUE_DQUOTE:
        if (c !== 0x22 /* " */) break

        this.attrs[this.attrName] = toStr(buf, this.start, pos)
        state = S_VALUE_END
        break

      case S_VALUE_SQUOTE:
        if (c !== 0x27 /* ' */) break

        this.attrs[this.attrName] = toStr(buf, this.start, pos)
        state = S_VALUE_END
        break

      case S_VALUE_END:
        if (isSpace(c) || c === 0x3E /* > */ || c === 0x2F /* / */) {
          state = S_TAG
          continue
        }

        this.status = FAIL
        break

      case S_VALUE_UNQUOTED:
        if (isUnquoted(c)) break

        this.attrs[this.attrName] = toStr(buf, this.start, pos)
        state = S_TAG
        continue
    }

    pos++
  }

  this.pos = pos
  this.state = state

  if (this.status === NEED_MORE && len === buf.length) this.status = FAIL
}


SvgHeaderParser.prototype.getStatus = function () {
  return this.status
}


var SVG_UNITS_RE = /in$|mm$|cm$|pt$|pc$|px$|em$|ex$/


// Filter NaN, Infinity, < 0
function isFinitePositive (val) {
  return typeof val === 'number' && isFinite(val) && val > 0
}


function units (str) {
  // all units are 2 chars long, no need to scan the whole value
  var suffix = str.slice(-2)

  var m = suffix.match(SVG_UNITS_RE)

  return m === null ? 'px' : m[0]
}


// Returns { width, height, type, mime, wUnits, hUnits } or undefined
//
SvgHeaderParser.prototype.getResult = function () {
  if (this.status !== DONE) return

  var attrs = this.attrs
  var wAttr = attrs.width || ''
  var hAttr = attrs.height || ''
  var vbAttr = attrs.viewBox || attrs.viewbox || ''

  // percentages are relative to the viewport, we can't resolve those
  if (wAttr.indexOf('%') !== -1) wAttr = ''
  if (hAttr.indexOf('%') !== -1) hAttr = ''

  var width = parseFloat(wAttr)
  var height = parseFloat(hAttr)

  // Extract from direct values

  if (wAttr && hAttr) {
    if (!isFinitePositive(width) || !isFinitePositive(height)) return

    return {
      width: width,
      height: height,
      type: 'svg',
      mime: 'image/svg+xml',
      wUnits: units(wAttr),
      hUnits: units(hAttr)
    }
  }

  // Extract from viewbox

  var parts = vbAttr.trim().split(/[\s,]+/)
  var vbWidth = parseFloat(parts[2])
  var vbHeight = parseFloat(parts[3])

  if (!isFinitePositive(vbWidth) || !isFinitePositive(vbHeight)) return
  if (units(parts[2]) !== units(parts[3])) return

  var ratio = vbWidth / vbHeight

  if (wAttr) {
    if (!isFinitePositive(width)) return

    return {
      width: width,
      height: width / ratio,
      type: 'svg',
      mime: 'image/svg+xml',
      wUnits: units(wAttr),
      hUnits: units(wAttr)
    }
  }

  if (hAttr) {
    if (!isFinitePositive(height)) return

    return {
      width: height * ratio,
      height: height,
      type: 'svg',
      mime: 'image/svg+xml',
      wUnits: units(hAttr),
      hUnits: units(hAttr)
    }
  }

  return {
    width: vbWidth,
    height: vbHeight,
    type: 'svg',
    mime: 'image/svg+xml',
    wUnits: units(parts[2]),
    hUnits: units(parts[3])
  }
}


exports.Parser = SvgHeaderParser
