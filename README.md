probe-image-size
================

[![Build Status](https://img.shields.io/travis/nodeca/probe-image-size/master.svg?style=flat)](https://travis-ci.org/nodeca/probe-image-size)
[![NPM version](https://img.shields.io/npm/v/probe-image-size.svg?style=flat)](https://www.npmjs.org/package/probe-image-size)
[![Coverage Status](https://coveralls.io/repos/github/nodeca/probe-image-size/badge.svg?branch=master)](https://coveralls.io/github/nodeca/probe-image-size?branch=master)

> Get image size without full download. Supported image types:
> JPG, GIF, PNG, WebP, BMP, TIFF, PSD.


Install
-------

```bash
npm install probe-image-size --save
```

Example
-------

```js
var probe = require('probe-image-size');

// Get by URL
//
probe('http://example.com/image.jpg', function (err, result) {
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpeg' }
});

// By URL with options
//
probe({ url: 'http://example.com/image.jpg', timeout: 5000 }, function (err, result) {
  console.log(result); // => { width: xx, height: yy, length: zz, type: 'jpg', mime: 'image/jpeg' }
});

// With Promise
//
probe('http://example.com/image.jpg').then(function (result) {
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpeg' }
});

// From the stream
//
var input = require('fs').createReadStream('image.jpg');

probe(input, function (err, result) {
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpeg' }

  // terminate input, depends on stream type,
  // this example is for fs streams only.
  input.destroy();
});

// From a Buffer
//
var data = require('fs').readFileSync('image.jpg');

console.log(probe.sync(data)); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpeg' }
```


API
---

### probe(src [, callback(err, result)])

`src` can be of this types:

- __String__ - URL to fetch
- __Object__ - options for [request](https://github.com/request/request),
  defaults are `{ timeout: 5000, maxRedirects: 2 }`
- __Stream__ - readable stream

`result` contains:

```js
{
  width: XX,
  height: YY,
  length: ZZ, // byte length of the file (if available, HTTP only)
  type: ..., // image 'type' (usual file name extention)
  mime: ...  // mime type
}
```

`err` is an error, which is extended with:

 - `code` - equals to `ECONTENT` if the library failed to parse the file;
 - `status` - equals to a HTTP status code if it receives a non-200 response.

If callback not provided, `Promise` will be returned.

__Note.__ If you use `Stream` as source, it's your responsibility to close that
stream in callback. In other case you can get memory leak, because stream will
be left in paused state. With http requests that's not a problem - everything
is released automatically, as soon as possible.


### sync.probe(src) -> result|null

Sync version can eat arrays, typed arrays and buffers. On success it returns
the same result as async version. On fail it returns null.

__Note.__ Formats like JPEG & TIFF can store size anywhere (far from the head).
That usually does not happens, but if you need guarantees - always provide full
file content to sync methods. We strongly recommend to use async version
as memory-friendly.


Similar projects
----------------

- [image-size](https://github.com/netroy/image-size)
- [imagesize](https://github.com/arnaud-lb/imagesize.js)


License
-------

[MIT](https://raw.github.com/nodeca/probe-image-size/master/LICENSE)
