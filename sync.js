'use strict'


var parsers = require('./lib/parsers_sync')


function probeBuffer (buffer) {
  var parser_names = Object.keys(parsers)

  for (var i = 0; i < parser_names.length; i++) {
    var result = parsers[parser_names[i]](buffer)

    if (result) {
      if (result.width > 0 && result.height > 0) return result
      return null
    }
  }

  return null
}


module.exports = function get_image_size (src) {
  return probeBuffer(src)
}

module.exports.parsers = parsers
