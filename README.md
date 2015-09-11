probe-image-size
================

[![Build Status](https://img.shields.io/travis/nodeca/probe-image-size/master.svg?style=flat)](https://travis-ci.org/nodeca/probe-image-size)
[![NPM version](https://img.shields.io/npm/v/probe-image-size.svg?style=flat)](https://www.npmjs.org/package/probe-image-size)


> Get image size without full download

Supported image types: JPG, GIF, PNG, BMP.


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
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpg' }
});

// By URL with options
//
probe({ url: 'http://example.com/image.jpg', timeout: 5000 }, function (err, result) {
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpg' }
});

// From stream
//
var input = require('fs').createReadStream('image.jpg');

probe(input, function (err, result) {
  console.log(result); // => { width: xx, height: yy, type: 'jpg', mime: 'image/jpg' }

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
- __Object__ - options for [request](https://github.com/request/request)
- __Stream__ - readable stream

`result` contains:

```js
{
  width: XX,
  height: YY,
  type: ..., // image type
  mime: ...  // mime type
}
```

`err` is extended with `status` field on bad server response.

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
