
'use strict';


var assert = require('assert');
var http   = require('http');
var URL    = require('url');
var probe  = require('../');


function createBuffer(src, opts) {
  if (typeof src === 'number') {
    return Buffer.alloc ? Buffer.alloc(src, opts) : new Buffer(src, opts);
  }
  return Buffer.from ? Buffer.from(src, opts) : new Buffer(src, opts);
}


var GIF1x1 = createBuffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');


describe('probeHttp', function () {
  var responder, url, srv;

  before(function (callback) {
    srv = http.createServer(function (req, res) {
      responder(req, res);
    }).listen(0, 'localhost', function (err) {

      url = URL.format({
        protocol: 'http',
        hostname: srv.address().address,
        port:     srv.address().port,
        path:     '/'
      });

      callback(err);
    });
  });

  it('should process an image (callback)', function (callback) {
    var haveResponse = false;

    responder = function (req, res) {
      req.on('close', function () {
        assert.ok(haveResponse);
        callback();
      });

      res.writeHead(200);
      res.write(GIF1x1);

      // response never ends
    };

    probe(url, function (err, size) {
      assert.ifError(err);
      assert.strictEqual(size.width, 1);
      assert.strictEqual(size.height, 1);
      assert.strictEqual(size.mime, 'image/gif');

      haveResponse = true;
    });
  });

  it('should process an image (promise)', function () {
    responder = function (req, res) {
      res.writeHead(200);
      res.write(GIF1x1);

      // response never ends
    };

    return probe(url).then(function (size) {
      assert.strictEqual(size.width, 1);
      assert.strictEqual(size.height, 1);
      assert.strictEqual(size.mime, 'image/gif');
    });
  });

  it('should return content-length', function () {
    responder = function (req, res) {
      res.writeHead(200, { 'Content-Length': 1234 });
      res.end(GIF1x1);
    };

    return probe(url).then(size => {
      assert.strictEqual(size.width, 1);
      assert.strictEqual(size.height, 1);
      assert.strictEqual(size.length, 1234);
      assert.strictEqual(size.mime, 'image/gif');
    });
  });

  // Check that client closes the connection after all parsers fail,
  //
  // NOTE: the server output should be large enough so all parsers
  //       that buffer data will have their first buffer filled
  //
  it('should abort request ASAP', function () {
    responder = function (req, res) {
      res.writeHead(200);
      res.write('this is not an image file,');
      res.write('it\'s just a bunch of text');
      // response never ends
    };

    return probe(url)
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.strictEqual(err.message, 'unrecognized file format'));
  });

  it('should fail on 404 (callback)', function (callback) {
    responder = function (req, res) {
      res.writeHead(404);
      res.write('not found');
      // response never ends
    };

    probe(url, function (err) {
      assert.strictEqual(err.statusCode, 404);

      callback();
    });
  });

  it('should fail on 404 (promise)', function () {
    responder = function (req, res) {
      res.writeHead(404);
      res.write('not found');
      // response never ends
    };

    return probe(url)
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.strictEqual(err.statusCode, 404));
  });

  it('should fail on status 201-299 codes', function () {
    responder = function (req, res) {
      res.writeHead(201);
      res.end(GIF1x1);
    };

    return probe(url)
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.strictEqual(err.statusCode, 201));
  });


  it('should return error if url is invalid', function () {
    return probe('badurl')
      .then(() => { throw new Error('should throw'); })
      // search error text for both `request` & `got` packages
      .catch(err => assert(err.message.match(/(ENOTFOUND badurl)|(Invalid URI)/)));
  });

  it('should return error if connection fails', function () {
    responder = function (req, res) {
      res.destroy();
    };

    //return probe({ url, retries: 0 })
    return probe(url, { retries: 0 })
      .then(() => { throw new Error('should throw'); })
      .catch(err => assert.strictEqual(err.code, 'ECONNRESET'));
  });

  it('should add User-Agent to http requests', function () {
    var userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    return probe(url).then(() => assert(/^probe/.test(userAgent)));
  });

  it('should allow customize request options', function () {
    var userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    return probe(url, { headers: { 'User-Agent': 'foobar ' } })
      .then(() => assert(/^foo/.test(userAgent)));
  });

  it('should allow customize request options (legacy)', function () {
    var userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    return probe({ url, headers: { 'User-Agent': 'foobar ' } })
      .then(() => assert(/^foo/.test(userAgent)));
  });


  it('should return url when following redirect', function () {
    responder = function (req, res) {
      if (req.url === '/redirect.gif') {
        res.writeHead(302, { Location: '/empty.gif' });
        res.end();
        return;
      }

      res.writeHead(200);
      res.end(GIF1x1);
    };

    return probe(url + '/redirect.gif')
      .then(function (size) {
        assert.strictEqual(size.url, url + '/empty.gif');
      });
  });


  after(function () {
    srv.close();
  });
});
