'use strict';

/* eslint-disable consistent-return */

var once      = require('../common').once;
var Transform = require('readable-stream').Transform;

var STATE_IDENTIFY  = 0; // look for '<'
var STATE_PARSE     = 1; // extract width and height from svg tag
var STATE_IGNORE    = 2; // we got all the data we want, skip the rest

// max size for pre-svg-tag comments plus svg tag itself
var MAX_DATA_LENGTH = 65536;

var SVG_HEADER_RE  = /<svg\s[^>]+>/;
var SVG_WIDTH_RE   = /\bwidth="([^%]+?)"|\bwidth='([^%]+?)'/;
var SVG_HEIGHT_RE  = /\bheight="([^%]+?)"|\bheight='([^%]+?)'/;
var SVG_VIEWBOX_RE = /\bviewbox="(.+?)"|\bviewbox='(.+?)'/;
var SVG_UNITS_RE   = /in$|mm$|cm$|pt$|pc$|px$|em$|ex$/;


function isWhiteSpace(chr) {
  return chr === 0x20 || chr === 0x09 || chr === 0x0D || chr === 0x0A;
}


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


function parseSvg(str) {
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

  var parts = (attrs.viewbox || '').split(' ');
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
}


module.exports = function (input, _callback) {
  var callback = once(_callback);
  var state    = STATE_IDENTIFY;
  var data_len = 0;
  var str      = '';

  var parser = new Transform({
    transform: function transform(chunk, encoding, next) {
      switch (state) {
        case STATE_IDENTIFY:
          var i = 0, max = chunk.length;

          while (i < max && isWhiteSpace(chunk[i])) i++;

          if (i >= max) {
            data_len += chunk.length;

            if (data_len > MAX_DATA_LENGTH) {
              state = STATE_IGNORE;
              callback();
            }

          } else if (chunk[i] === 0x3c /* < */) {
            state = STATE_PARSE;
            return transform(chunk, encoding, next);

          } else {
            state = STATE_IGNORE;
            callback();
          }

          break;

        case STATE_PARSE:
          str += chunk.toString();

          var result = parseSvg(str);

          if (result) {
            callback(null, result);
            break;
          }

          data_len += chunk.length;

          if (data_len > MAX_DATA_LENGTH) {
            state = STATE_IGNORE;
            callback();
          }

          break;
      }

      next();
    },

    flush: function () {
      state = STATE_IGNORE;
      callback();
    }
  });

  input.pipe(parser);

  return parser;
};
