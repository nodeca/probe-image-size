'use strict';

const assert = require('assert');
const { describe, it } = require('node:test');
const common = require('../lib/common');

describe('common read helpers', function () {
  describe('readUInt16LE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readUInt16LE([0x00, 0x00], 0), 0);
    });
    it('reads max (0xFFFF)', function () {
      assert.strictEqual(common.readUInt16LE([0xFF, 0xFF], 0), 0xFFFF);
    });
    it('reads 0x0102', function () {
      assert.strictEqual(common.readUInt16LE([0x02, 0x01], 0), 0x0102);
    });
    it('respects offset', function () {
      assert.strictEqual(common.readUInt16LE([0xAA, 0x02, 0x01], 1), 0x0102);
    });
  });

  describe('readUInt16BE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readUInt16BE([0x00, 0x00], 0), 0);
    });
    it('reads max (0xFFFF)', function () {
      assert.strictEqual(common.readUInt16BE([0xFF, 0xFF], 0), 0xFFFF);
    });
    it('reads 0x0102', function () {
      assert.strictEqual(common.readUInt16BE([0x01, 0x02], 0), 0x0102);
    });
    it('respects offset', function () {
      assert.strictEqual(common.readUInt16BE([0xAA, 0x01, 0x02], 1), 0x0102);
    });
  });

  describe('readInt16LE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readInt16LE([0x00, 0x00], 0), 0);
    });
    it('reads positive max (0x7FFF)', function () {
      assert.strictEqual(common.readInt16LE([0xFF, 0x7F], 0), 0x7FFF);
    });
    it('reads -1 (0xFFFF)', function () {
      assert.strictEqual(common.readInt16LE([0xFF, 0xFF], 0), -1);
    });
    it('reads -32768 (0x8000)', function () {
      assert.strictEqual(common.readInt16LE([0x00, 0x80], 0), -32768);
    });
    it('reads -256 (0xFF00)', function () {
      assert.strictEqual(common.readInt16LE([0x00, 0xFF], 0), -256);
    });
  });

  describe('readInt16BE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readInt16BE([0x00, 0x00], 0), 0);
    });
    it('reads positive max (0x7FFF)', function () {
      assert.strictEqual(common.readInt16BE([0x7F, 0xFF], 0), 0x7FFF);
    });
    it('reads -1 (0xFFFF)', function () {
      assert.strictEqual(common.readInt16BE([0xFF, 0xFF], 0), -1);
    });
    it('reads -32768 (0x8000)', function () {
      assert.strictEqual(common.readInt16BE([0x80, 0x00], 0), -32768);
    });
  });

  describe('readUInt32LE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readUInt32LE([0x00, 0x00, 0x00, 0x00], 0), 0);
    });
    it('reads max (0xFFFFFFFF)', function () {
      assert.strictEqual(common.readUInt32LE([0xFF, 0xFF, 0xFF, 0xFF], 0), 0xFFFFFFFF);
    });
    it('result is positive for high-bit-set values', function () {
      // 0x80000000 — previously returned negative due to | operator bug
      assert.strictEqual(common.readUInt32LE([0x00, 0x00, 0x00, 0x80], 0), 0x80000000);
      assert.ok(common.readUInt32LE([0x00, 0x00, 0x00, 0x80], 0) > 0);
    });
    it('reads 0x01020304', function () {
      assert.strictEqual(common.readUInt32LE([0x04, 0x03, 0x02, 0x01], 0), 0x01020304);
    });
    it('respects offset', function () {
      assert.strictEqual(common.readUInt32LE([0xAA, 0x04, 0x03, 0x02, 0x01], 1), 0x01020304);
    });
  });

  describe('readUInt32BE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readUInt32BE([0x00, 0x00, 0x00, 0x00], 0), 0);
    });
    it('reads max (0xFFFFFFFF)', function () {
      assert.strictEqual(common.readUInt32BE([0xFF, 0xFF, 0xFF, 0xFF], 0), 0xFFFFFFFF);
    });
    it('result is positive for high-bit-set values', function () {
      // 0x80000000 — previously returned negative due to | operator bug
      assert.strictEqual(common.readUInt32BE([0x80, 0x00, 0x00, 0x00], 0), 0x80000000);
      assert.ok(common.readUInt32BE([0x80, 0x00, 0x00, 0x00], 0) > 0);
    });
    it('reads 0x01020304', function () {
      assert.strictEqual(common.readUInt32BE([0x01, 0x02, 0x03, 0x04], 0), 0x01020304);
    });
    it('respects offset', function () {
      assert.strictEqual(common.readUInt32BE([0xAA, 0x01, 0x02, 0x03, 0x04], 1), 0x01020304);
    });
  });

  describe('readInt32LE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readInt32LE([0x00, 0x00, 0x00, 0x00], 0), 0);
    });
    it('reads positive max (0x7FFFFFFF)', function () {
      assert.strictEqual(common.readInt32LE([0xFF, 0xFF, 0xFF, 0x7F], 0), 0x7FFFFFFF);
    });
    it('reads -1 (0xFFFFFFFF)', function () {
      assert.strictEqual(common.readInt32LE([0xFF, 0xFF, 0xFF, 0xFF], 0), -1);
    });
    it('reads -2147483648 (0x80000000)', function () {
      assert.strictEqual(common.readInt32LE([0x00, 0x00, 0x00, 0x80], 0), -2147483648);
    });
    it('reads 0x01020304', function () {
      assert.strictEqual(common.readInt32LE([0x04, 0x03, 0x02, 0x01], 0), 0x01020304);
    });
  });

  describe('readInt32BE', function () {
    it('reads zero', function () {
      assert.strictEqual(common.readInt32BE([0x00, 0x00, 0x00, 0x00], 0), 0);
    });
    it('reads positive max (0x7FFFFFFF)', function () {
      assert.strictEqual(common.readInt32BE([0x7F, 0xFF, 0xFF, 0xFF], 0), 0x7FFFFFFF);
    });
    it('reads -1 (0xFFFFFFFF)', function () {
      assert.strictEqual(common.readInt32BE([0xFF, 0xFF, 0xFF, 0xFF], 0), -1);
    });
    it('reads -2147483648 (0x80000000)', function () {
      assert.strictEqual(common.readInt32BE([0x80, 0x00, 0x00, 0x00], 0), -2147483648);
    });
    it('reads 0x01020304', function () {
      assert.strictEqual(common.readInt32BE([0x01, 0x02, 0x03, 0x04], 0), 0x01020304);
    });
  });
});
