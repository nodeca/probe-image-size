'use strict';

/* eslint-disable consistent-return */

function canBeSvg(buf) {
  var i = 0, max = buf.length;

  while (i < max && buf[i] === 0x20) i++;

  if (i === max) return false;
  return buf[i] === 0x3c; /* < */
}


var SVG_HEADER_RE  = /<svg\s[^>]+>/;
var SVG_WIDTH_RE   = /\bwidth="([^%]+?)"|\bwidth='([^%]+?)'/;
var SVG_HEIGHT_RE  = /\bheight="([^%]+?)"|\bheight='([^%]+?)'/;
var SVG_VIEWBOX_RE = /\bviewbox="(.+?)"|\bviewbox='(.+?)'/;
var SVG_UNITS_RE   = /in$|mm$|cm$|pt$|pc$|px$|em$|ex$/;

function svgAttrs(str) {
  var width   = str.match(SVG_WIDTH_RE);
  var height  = str.match(SVG_HEIGHT_RE);
  var viewbox = str.match(SVG_VIEWBOX_RE);

  return {
    width:   width && (width[1] || width[2]),
    height:  height && (height[1] || height[2]),
    viewbox: viewbox && (viewbox[1] || viewbox[2])
  };
}


function units(str) {
  if (!SVG_UNITS_RE.test(str)) return 'px';

  return str.match(SVG_UNITS_RE)[0];
}


module.exports = function (data) {
  if (!canBeSvg(data)) return;

  var str = '';

  for (var i = 0; i < data.length; i++) {
    // 1. We can't rely on buffer features
    // 2. Don't care about UTF16 because ascii is enougth for our goals
    str += String.fromCharCode(data[i]);
  }

  if (!SVG_HEADER_RE.test(str)) return;

  var attrs  = svgAttrs(str.match(SVG_HEADER_RE)[0]);
  var width  = parseFloat(attrs.width) || 0;  // NaN -> 0
  var height = parseFloat(attrs.height) || 0; // NaN -> 0

  // Extract from direct values

  if (attrs.width && attrs.height) {
    if (width <= 0 || height <= 0) return;

    return {
      width:  width,
      height: height,
      type:   'svg',
      mime:   'image/svg+xml',
      wUnits: units(attrs.width),
      hUnits: units(attrs.height)
    };
  }

  // Extract from viewbox

  var parts = attrs.viewbox.split(' ');
  var viewbox = {
    width:  parts[2],
    height: parts[3]
  };
  var vbWidth  = parseFloat(viewbox.width) || 0;  // NaN -> 0
  var vbHeight = parseFloat(viewbox.height) || 0; // NaN -> 0

  if (vbWidth <= 0 || vbHeight <= 0) return;
  if (units(viewbox.width) !== units(viewbox.height)) return;

  var ratio = vbWidth / vbHeight;

  if (attrs.width) {
    if (width <= 0) return;

    return {
      width:  width,
      height: width / ratio,
      type:   'svg',
      mime:   'image/svg+xml',
      wUnits: units(attrs.width),
      hUnits: units(attrs.width)
    };
  }

  if (attrs.height) {
    if (height <= 0) return;

    return {
      width:  height * ratio,
      height: height,
      type:   'svg',
      mime:   'image/svg+xml',
      wUnits: units(attrs.height),
      hUnits: units(attrs.height)
    };
  }

  return {
    width:  vbWidth,
    height: vbHeight,
    type:   'svg',
    mime:   'image/svg+xml',
    wUnits: units(viewbox.width),
    hUnits: units(viewbox.height)
  };
};
