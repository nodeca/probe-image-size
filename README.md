probe-image-size
================

[![Build Status](https://img.shields.io/travis/nodeca/probe-image-size/master.svg?style=flat)](https://travis-ci.org/nodeca/probe-image-size)
[![NPM version](https://img.shields.io/npm/v/probe-image-size.svg?style=flat)](https://www.npmjs.org/package/probe-image-size)

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

// From the stream
//
var input = require('fs').createReadStream('image.jpg');

probe(input, function (err, result) {
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpeg' }

  // terminate input, depends on stream type,
  // this example is for fs streams only.
  input.destroy();
});
```


API
---

### probe(src, callback(err, result))

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

__Note.__ If you use stream as source, it's your responsibility to terminate
reading in callback. That will release resources as soon as possible. On
http requests that's done automatically.


Similar projects
----------------

- [image-size](https://github.com/netroy/image-size)
- [imagesize](https://github.com/arnaud-lb/imagesize.js)


License
-------

[MIT](https://raw.github.com/nodeca/probe-image-size/master/LICENSE)
