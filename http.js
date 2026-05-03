'use strict'


var ProbeError = require('./lib/common').ProbeError
var needle = require('needle')
var lodashMerge = require('lodash.merge')
var pkg = require('./package.json')
var probeStream = require('./stream')
var URL = require('url').URL

var defaultAgent = pkg.name + '/' + pkg.version + '(+https://github.com/nodeca/probe-image-size)'

var defaults = {
  open_timeout: 10000,
  response_timeout: 60000,
  read_timeout: 60000,
  follow_max: 10,
  parse_response: false,
  // Use to ignore bad certificates.
  // rejectUnauthorized: false,
  headers: {
    'User-Agent': defaultAgent
  }
}


module.exports = function probeHttp (src, options) {
  return new Promise(function (resolve, reject) {
    var stream
    var len
    var finalUrl = src
    var settled = false

    function abortRequest () {
      if (stream && stream.request) stream.request.abort()
    }

    function settle (resolveResult, rejectError) {
      if (settled) return
      settled = true

      if (rejectError) {
        reject(rejectError)
        abortRequest()
        return
      }

      resolve(resolveResult)
      abortRequest()
    }

    try {
      var needleOptions = lodashMerge({}, defaults, options)
      stream = needle.get(src, needleOptions)
    } catch (err) {
      reject(err)
      return
    }

    stream.on('redirect', function (location) {
      try {
        finalUrl = new URL(location, finalUrl).href
      } catch (err) {
        settle(null, err)
      }
    })

    stream.on('header', function (statusCode, headers) {
      if (statusCode !== 200) {
        settle(null, new ProbeError('bad status code: ' + statusCode, null, statusCode))
        return
      }

      len = headers['content-length']
    })

    stream.on('err', function (err) {
      settle(null, err)
    })

    stream.on('done', function (err) {
      if (err) settle(null, err)
    })

    probeStream(stream, true)
      .then(function (result) {
        if (len && len.match(/^\d+$/)) result.length = +len

        result.url = finalUrl

        settle(result)
      })
      .catch(function (err) {
        settle(null, err)
      })
  })
}


module.exports.parsers = require('./lib/parsers_stream')
