'use strict'


// Shared status codes for incremental parsers.
exports.NEED_MORE = 0
exports.DONE = 1
exports.FAIL = 2


exports.sliceEq = function (src, start, dest) {
  for (var i = start, j = 0; j < dest.length;) {
    if (src[i++] !== dest[j++]) return false
  }
  return true
}

exports.str2arr = function (str, format) {
  var arr = []
  var i = 0

  if (format && format === 'hex') {
    while (i < str.length) {
      arr.push(parseInt(str.slice(i, i + 2), 16))
      i += 2
    }
  } else {
    for (; i < str.length; i++) {
      arr.push(str.charCodeAt(i) & 0xFF)
    }
  }

  return arr
}

function ProbeError (message, code, statusCode) {
  Error.call(this)

  // Include stack trace in error object
  if (Error.captureStackTrace) {
    // Chrome and NodeJS
    Error.captureStackTrace(this, this.constructor)
  } else {
    // FF, IE 10+ and Safari 6+. Fallback for others
    this.stack = (new Error()).stack || ''
  }

  this.name = this.constructor.name

  this.message = message
  if (code) this.code = code
  if (statusCode) this.statusCode = statusCode
}

// Inherit from Error
ProbeError.prototype = Object.create(Error.prototype)
ProbeError.prototype.constructor = ProbeError


exports.ProbeError = ProbeError
