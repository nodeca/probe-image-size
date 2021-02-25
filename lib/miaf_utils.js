// Utils used to parse miaf-based files (avif/heic/heif)
//
//  - image collections are not supported (only last size is reported)
//  - images with metadata encoded after image data are not supported
//  - images without any `ispe` box are not supported
//
// ISO media file spec:
// https://web.archive.org/web/20180219054429/http://l.web.umkc.edu/lizhu/teaching/2016sp.video-communication/ref/mp4.pdf
//
// ISO image file format spec:
// https://standards.iso.org/ittf/PubliclyAvailableStandards/c066067_ISO_IEC_23008-12_2017.zip
//

'use strict';

/* eslint-disable consistent-return */

var readUInt32BE = require('./common').readUInt32BE;

/*
 * interface Box {
 *   size:       uint32;   // if size == 0, box lasts until EOF
 *   boxtype:    char[4];
 *   largesize?: uint64;   // only if size == 1
 *   usertype?:  char[16]; // only if boxtype == 'uuid'
 * }
 */
function unbox(data, offset) {
  if (data.length < 4 + offset) return null;

  var size = readUInt32BE(data, offset);

  // size includes first 4 bytes (length)
  if (data.length < size + offset || size < 8) return null;

  // if size === 1, real size is following uint64 (only for big boxes, not needed)
  // if size === 0, real size is until the end of the file (only for big boxes, not needed)

  return {
    boxtype: String.fromCharCode.apply(null, data.slice(offset + 4, offset + 8)),
    data:    data.slice(offset + 8, offset + size),
    end:     offset + size
  };
}


module.exports.unbox = unbox;


// return { width, height } from `ispe` block
function scanSizesFromIspe(data, sizes_acc) {
  sizes_acc.push({
    width:  readUInt32BE(data, 4),
    height: readUInt32BE(data, 8)
  });
}


// return { width, height } from `ipco` -> `ispe` block
function scanSizesFromIpco(data, sizes_acc) {
  var offset = 0;

  for (;;) {
    var box = unbox(data, offset);
    if (!box) break;
    if (box.boxtype === 'ispe') scanSizesFromIspe(box.data, sizes_acc);
    offset = box.end;
  }
}


// return { width, height } from `iprp` -> `ipco` -> `ispe` block
function scanSizesFromIprp(data, sizes_acc) {
  var offset = 0;

  for (;;) {
    var box = unbox(data, offset);
    if (!box) break;
    if (box.boxtype === 'ipco') scanSizesFromIpco(box.data, sizes_acc);
    offset = box.end;
  }
}


// return { width, height } from `meta` -> `iprp` -> `ipco` -> `ispe` block
function scanSizesFromMeta(data, sizes_acc) {
  var offset = 4; // version + flags

  for (;;) {
    var box = unbox(data, offset);
    if (!box) break;
    if (box.boxtype === 'iprp') scanSizesFromIprp(box.data, sizes_acc);
    offset = box.end;
  }
}


// get image with largest single dimension as base
function getMaxSize(sizes) {
  var maxWidthSize = sizes.reduce(function (a, b) {
    return a.width > b.width || (a.width === b.width && a.height > b.height) ? a : b;
  });

  var maxHeightSize = sizes.reduce(function (a, b) {
    return a.height > b.height || (a.height === b.height && a.width > b.width) ? a : b;
  });

  var maxSize;

  if (maxWidthSize.width > maxHeightSize.height ||
      (maxWidthSize.width === maxHeightSize.height && maxWidthSize.height > maxHeightSize.width)) {
    maxSize = maxWidthSize;
  } else {
    maxSize = maxHeightSize;
  }

  return maxSize;
}


module.exports.readSizeFromMeta = function (data) {
  var sizes = [];

  scanSizesFromMeta(data, sizes);

  if (!sizes.length) return;

  var maxSize = getMaxSize(sizes);

  return {
    width: maxSize.width,
    height: maxSize.height,
    variants: sizes
  };
};


module.exports.getMimeType = function (data) {
  var brand = String.fromCharCode.apply(null, data.slice(0, 4));
  var compat = {};

  compat[brand] = true;

  for (var i = 8; i < data.length; i += 4) {
    compat[String.fromCharCode.apply(null, data.slice(i, i + 4))] = true;
  }

  // heic and avif are superset of miaf, so they should all list mif1 as compatible
  if (!compat.mif1 && !compat.msf1 && !compat.miaf) return;

  if (brand === 'avif' || brand === 'avis' || brand === 'avio') {
    // `.avifs` and `image/avif-sequence` are removed from spec, all files have single type
    return { type: 'avif', mime: 'image/avif' };
  }

  // https://nokiatech.github.io/heif/technical.html
  if (brand === 'heic' || brand === 'heix') {
    return { type: 'heic', mime: 'image/heic' };
  }

  if (brand === 'hevc' || brand === 'hevx') {
    return { type: 'heic', mime: 'image/heic-sequence' };
  }

  if (compat.avif || compat.avis) {
    return { type: 'avif', mime: 'image/avif' };
  }

  if (compat.heic || compat.heix || compat.hevc || compat.hevx || compat.heis) {
    if (compat.msf1) {
      return { type: 'heif', mime: 'image/heif-sequence' };
    }
    return { type: 'heif', mime: 'image/heif' };
  }

  return { type: 'avif', mime: 'image/avif' };
};
