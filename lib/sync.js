
'use strict';


var parsers = {
  bmp:  require('./parse_sync/bmp'),
  gif:  require('./parse_sync/gif'),
  //jpeg: require('./parse_sync/jpeg'),
  png:  require('./parse_sync/png'),
  psd:  require('./parse_sync/psd'),
  tiff: require('./parse_sync/tiff'),
  webp: require('./parse_sync/webp')
};


function probeBuffer(buffer) {
  var parser_names = Object.keys(parsers);

  for (var i = 0; i < parser_names.length; i++) {
    var result = parsers[parser_names[i]](buffer);

    if (result) return result;
  }

  return null;
}


///////////////////////////////////////////////////////////////////////
// Exports
//

module.exports = function get_image_size(src) {
  return probeBuffer(src);
};

module.exports.parsers = parsers;
