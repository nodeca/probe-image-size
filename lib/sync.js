
'use strict';


var parsers = {
  bmp:  require('./parse_buffer/bmp'),
  gif:  require('./parse_buffer/gif'),
  //jpeg: require('./parse_buffer/jpeg'),
  png:  require('./parse_buffer/png'),
  psd:  require('./parse_buffer/psd'),
  //tiff: require('./parse_buffer/tiff'),
  webp: require('./parse_buffer/webp')
};


function probeBuffer(buffer) {
  var parser_names = Object.keys(parsers);

  for (var i = 0; i < parser_names.length; i++) {
    var result = parsers[parser_names[i]](buffer);

    if (result) return result;
  }

  var error = new Error('unrecognized file format');
  error.code = 'ECONTENT';
  throw error;
}


///////////////////////////////////////////////////////////////////////
// Exports
//

module.exports = function get_image_size(src) {
  return probeBuffer(src);
};

module.exports.parsers = parsers;
