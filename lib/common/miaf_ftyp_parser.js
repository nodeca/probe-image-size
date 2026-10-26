'use strict'


var NEED_MORE = require('./utils').NEED_MORE
var DONE = require('./utils').DONE
var FAIL = require('./utils').FAIL


var S_MAJOR_BRAND = 0
var S_MINOR_VERSION = 1
var S_COMPATIBLE_BRAND = 2


// ftyp_size excludes the outer box header.
function MiafFtypParser (ftyp_size) {
  this.partial_buffer = new Uint8Array(4)
  this.buffered_bytes = 0
  this.bytes_left = ftyp_size
  this.state = S_MAJOR_BRAND
  this.status = Number.isSafeInteger(ftyp_size) && ftyp_size >= 8 && ftyp_size % 4 === 0 ? NEED_MORE : FAIL
  this.major_brand = ''
  this.compatible_brands = Object.create(null)
}


// Input starts at major_brand. Only fields split across chunks are copied.
MiafFtypParser.prototype.push = function (chunk) {
  if (this.status !== NEED_MORE) return
  var chunk_offset = 0

  while (this.bytes_left > 0 && chunk_offset < chunk.length) {
    var read_buffer = chunk
    var read_offset = chunk_offset

    if (this.buffered_bytes > 0 || chunk.length - chunk_offset < 4) {
      var bytes_to_copy = Math.min(4 - this.buffered_bytes, chunk.length - chunk_offset)
      for (var i = 0; i < bytes_to_copy; i++) this.partial_buffer[this.buffered_bytes++] = chunk[chunk_offset++]
      this.bytes_left -= bytes_to_copy
      if (this.buffered_bytes < 4) return

      read_buffer = this.partial_buffer
      read_offset = 0
      this.buffered_bytes = 0
    } else {
      chunk_offset += 4
      this.bytes_left -= 4
    }

    var brand = String.fromCharCode(
      read_buffer[read_offset], read_buffer[read_offset + 1],
      read_buffer[read_offset + 2], read_buffer[read_offset + 3]
    )

    switch (this.state) {
      case S_MAJOR_BRAND:
        this.major_brand = brand
        this.state = S_MINOR_VERSION
        break

      case S_MINOR_VERSION:
        this.state = S_COMPATIBLE_BRAND
        continue
    }

    // Keep only brands used to select the MIME type, including major_brand.
    switch (brand) {
      case 'mif1':
      case 'msf1':
      case 'miaf':
      case 'avif':
      case 'avis':
      case 'heic':
      case 'heix':
      case 'hevc':
      case 'hevx':
      case 'heis':
        this.compatible_brands[brand] = true
        break
    }
  }

  if (this.bytes_left === 0) this.status = DONE
}


MiafFtypParser.prototype.getStatus = function () {
  return this.status
}


MiafFtypParser.prototype.getResult = function () {
  if (this.status !== DONE) return

  var brand = this.major_brand
  var compat = this.compatible_brands

  if (!compat.mif1 && !compat.msf1 && !compat.miaf) return

  if (brand === 'avif' || brand === 'avis' || brand === 'avio') {
    return { type: 'avif', mime: 'image/avif' }
  }

  if (brand === 'heic' || brand === 'heix') {
    return { type: 'heic', mime: 'image/heic' }
  }

  if (brand === 'hevc' || brand === 'hevx') {
    return { type: 'heic', mime: 'image/heic-sequence' }
  }

  if (compat.avif || compat.avis) {
    return { type: 'avif', mime: 'image/avif' }
  }

  if (compat.heic || compat.heix || compat.hevc || compat.hevx || compat.heis) {
    if (compat.msf1) {
      return { type: 'heif', mime: 'image/heif-sequence' }
    }

    return { type: 'heif', mime: 'image/heif' }
  }

  return { type: 'avif', mime: 'image/avif' }
}


exports.Parser = MiafFtypParser
