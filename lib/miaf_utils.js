// Utils used to parse miaf-based files (avif/heic/heif)
//
// ISO media file spec:
// https://web.archive.org/web/20180219054429/http://l.web.umkc.edu/lizhu/teaching/2016sp.video-communication/ref/mp4.pdf
//
// ISO image file format spec:
// https://standards.iso.org/ittf/PubliclyAvailableStandards/c066067_ISO_IEC_23008-12_2017.zip
//

'use strict';

/* eslint-disable consistent-return */
/* eslint-disable no-bitwise */

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


// return { width, height } from `ipco` -> `ispe` block
function scanSizesFromIpco(data, sandbox) {
  var offset = 0;

  for (;;) {
    var box = unbox(data, offset);
    if (!box) break;

    switch (box.boxtype) {
      case 'ispe':
        sandbox.sizes.push({
          width:  readUInt32BE(box.data, 4),
          height: readUInt32BE(box.data, 8)
        });
        break;

      case 'irot':
        sandbox.transforms.push({
          type: 'irot',
          value: box.data[0] & 3
        });
        break;

      case 'imir':
        sandbox.transforms.push({
          type: 'imir',
          value: box.data[0] & 1
        });
        break;
    }

    offset = box.end;
  }
}


// return { width, height } from `iprp` -> `ipco` -> `ispe` block
function scanSizesFromIprp(data, sandbox) {
  var offset = 0;

  for (;;) {
    var box = unbox(data, offset);
    if (!box) break;
    if (box.boxtype === 'ipco') scanSizesFromIpco(box.data, sandbox);
    offset = box.end;
  }
}


// return { width, height } from `meta` -> `iprp` -> `ipco` -> `ispe` block
function scanSizesFromMeta(data, sandbox) {
  var offset = 4; // version + flags

  for (;;) {
    var box = unbox(data, offset);
    if (!box) break;
    if (box.boxtype === 'iprp') scanSizesFromIprp(box.data, sandbox);
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
  var sandbox = {
    sizes: [],
    transforms: []
  };

  scanSizesFromMeta(data, sandbox);

  if (!sandbox.sizes.length) return;

  var maxSize = getMaxSize(sandbox.sizes);

  var orientation = 1;

  // convert imir/irot to exif orientation
  sandbox.transforms.forEach(function (transform) {
    var rotate_ccw  = { 1: 6, 2: 5, 3: 8, 4: 7, 5: 4, 6: 3, 7: 2, 8: 1 };
    var mirror_vert = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 6, 6: 5, 7: 8, 8: 7 };

    if (transform.type === 'imir') {
      if (transform.value === 0) {
        // vertical flip
        orientation = mirror_vert[orientation];
      } else {
        // horizontal flip = vertical flip + 180 deg rotation
        orientation = mirror_vert[orientation];
        orientation = rotate_ccw[orientation];
        orientation = rotate_ccw[orientation];
      }
    } else if (transform.type === 'irot') {
      // counter-clockwise rotation 90 deg 0-3 times
      for (var i = 0; i < transform.value; i++) {
        orientation = rotate_ccw[orientation];
      }
    }
  });

  return {
    width: maxSize.width,
    height: maxSize.height,
    orientation: sandbox.transforms.length ? orientation : null,
    variants: sandbox.sizes
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
