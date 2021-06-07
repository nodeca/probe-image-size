
'use strict';


const assert = require('assert');
const http   = require('http');
const URL    = require('url');
const zlib   = require('zlib');
const probe  = require('../');


const GIF1x1 = Buffer.from('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64');


describe('probeHttp', function () {
  let responder, url, srv;

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

  it('should process an image', async function () {
    responder = function (req, res) {
      res.writeHead(200);
      res.write(GIF1x1);

      // response never ends
    };

    let size = await probe(url);

    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('should return content-length', async function () {
    responder = function (req, res) {
      res.writeHead(200, { 'Content-Length': 1234 });
      res.end(GIF1x1);
    };

    let size = await probe(url);

    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.length, 1234);
    assert.strictEqual(size.mime, 'image/gif');
  });

  // Check that client closes the connection after all parsers fail,
  //
  // NOTE: the server output should be large enough so all parsers
  //       that buffer data will have their first buffer filled
  //
  it('should abort request ASAP', async function () {
    responder = function (req, res) {
      res.writeHead(200);
      res.write('this is not an image file,');
      res.write('it\'s just a bunch of text');
      // response never ends
    };

    await assert.rejects(
      async () => probe(url),
      /unrecognized file format/
    );
  });

  it('should fail on 404', async function () {
    responder = function (req, res) {
      res.writeHead(404);
      res.write('not found');
      // response never ends
    };

    await assert.rejects(
      async () => probe(url),
      { statusCode: 404 }
    );
  });

  it('should fail on status 201-299 codes', async function () {
    responder = function (req, res) {
      res.writeHead(201);
      res.end(GIF1x1);
    };

    await assert.rejects(
      async () => probe(url),
      { statusCode: 201 }
    );
  });

  it('should return error if url is not a string', async function () {
    // for coverage
    await assert.rejects(
      async () => probe(123),
      /URL must be a string/
    );
  });

  it('should return error if url is invalid', async function () {
    await assert.rejects(
      async () => probe('badurl'),
      // search error text for both `request` / `got` / Github Actions
      /(ENOTFOUND badurl)|(Invalid URI)|(getaddrinfo EAI_AGAIN)/
    );
  });

  it('should return error if connection fails', async function () {
    responder = function (req, res) {
      res.destroy();
    };

    await assert.rejects(
      async () => probe(url, { retries: 0 }),
      { code: 'ECONNRESET' }
    );
  });

  it('should add User-Agent to http requests', async function () {
    let userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    await probe(url);

    assert(/^probe/.test(userAgent));
  });

  it('should allow customize request options', async function () {
    let userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    await probe(url, { headers: { 'User-Agent': 'foobar ' } });

    assert(/^foo/.test(userAgent));
  });

  it('should return url when following redirect', async function () {
    responder = function (req, res) {
      if (req.url === '/redirect.gif') {
        res.writeHead(302, { Location: url + '/empty.gif' });
        res.end();
        return;
      }

      res.writeHead(200);
      res.end(GIF1x1);
    };

    let size = await probe(url + '/redirect.gif');

    assert.strictEqual(size.url, url + '/empty.gif');
    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('should follow relative redirect', async function () {
    responder = function (req, res) {
      if (req.url === '/path/to/step1.gif') {
        res.writeHead(302, { Location: '../step2.gif' });
        res.end();
        return;
      }

      if (req.url === '/path/step2.gif') {
        res.writeHead(302, { Location: 'step3.gif' });
        res.end();
        return;
      }

      res.writeHead(200);
      res.end(GIF1x1);
    };

    let size = await probe(url + '/path/to/step1.gif');

    assert.strictEqual(size.url, url + '/path/step3.gif');
    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('should accept gzip-encoded output when not requested by client', async function () {
    let encoding;

    responder = function (req, res) {
      encoding = req.headers['accept-encoding'] || 'identity';
      res.setHeader('content-encoding', 'gzip');
      res.writeHead(200);
      res.end(zlib.gzipSync(GIF1x1));
    };

    let size = await probe(url + '/empty.gif');

    // make sure client requested no compression
    assert.strictEqual(encoding, 'identity');

    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });


  after(function () {
    srv.close();
  });
});

describe('probeHttpWithAgent', function () {
  let responder, url, srv;

  let httpAgent = new http.Agent({
    keepAlive  : true,
    maxSockets : 1
  });

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

  it('should process an image', async function () {
    responder = function (req, res) {
      res.writeHead(200);
      res.write(GIF1x1);

      // response never ends
    };

    let size = await probe(url, { agent: httpAgent });

    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('should return content-length', async function () {
    responder = function (req, res) {
      res.writeHead(200, { 'Content-Length': 1234 });
      res.end(GIF1x1);
    };

    let size = await probe(url, { agent: httpAgent });

    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.length, 1234);
    assert.strictEqual(size.mime, 'image/gif');
  });

  // Check that client closes the connection after all parsers fail,
  //
  // NOTE: the server output should be large enough so all parsers
  //       that buffer data will have their first buffer filled
  //
  it('should abort request ASAP', async function () {
    responder = function (req, res) {
      res.writeHead(200);
      res.write('this is not an image file,');
      res.write('it\'s just a bunch of text');
      // response never ends
    };

    await assert.rejects(
      async () => probe(url, { agent: httpAgent }),
      /unrecognized file format/
    );
  });

  it('should fail on 404', async function () {
    responder = function (req, res) {
      res.writeHead(404);
      res.write('not found');
      // response never ends
    };

    await assert.rejects(
      async () => probe(url, { agent: httpAgent }),
      { statusCode: 404 }
    );
  });

  it('should fail on status 201-299 codes', async function () {
    responder = function (req, res) {
      res.writeHead(201);
      res.end(GIF1x1);
    };

    await assert.rejects(
      async () => probe(url, { agent: httpAgent }),
      { statusCode: 201 }
    );
  });

  it('should return error if url is not a string', async function () {
    // for coverage
    await assert.rejects(
      async () => probe(123),
      /URL must be a string/
    );
  });

  it('should return error if url is invalid', async function () {
    await assert.rejects(
      async () => probe('badurl'),
      // search error text for both `request` / `got` / Github Actions
      /(ENOTFOUND badurl)|(Invalid URI)|(getaddrinfo EAI_AGAIN)/
    );
  });

  it('should return error if connection fails', async function () {
    responder = function (req, res) {
      res.destroy();
    };

    await assert.rejects(
      async () => probe(url, { retries: 0 }),
      { code: 'ECONNRESET' }
    );
  });

  it('should add User-Agent to http requests', async function () {
    let userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    await probe(url, { agent: httpAgent });

    assert(/^probe/.test(userAgent));
  });

  it('should allow customize request options', async function () {
    let userAgent;

    responder = function (req, res) {
      userAgent = req.headers['user-agent'];

      res.writeHead(200);
      res.end(GIF1x1);
    };

    await probe(url, { headers: { 'User-Agent': 'foobar ' } });

    assert(/^foo/.test(userAgent));
  });

  it('should return url when following redirect', async function () {
    responder = function (req, res) {
      if (req.url === '/redirect.gif') {
        res.writeHead(302, { Location: url + '/empty.gif' });
        res.end();
        return;
      }

      res.writeHead(200);
      res.end(GIF1x1);
    };

    let size = await probe(url + '/redirect.gif');

    assert.strictEqual(size.url, url + '/empty.gif');
    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('should follow relative redirect', async function () {
    responder = function (req, res) {
      if (req.url === '/path/to/step1.gif') {
        res.writeHead(302, { Location: '../step2.gif' });
        res.end();
        return;
      }

      if (req.url === '/path/step2.gif') {
        res.writeHead(302, { Location: 'step3.gif' });
        res.end();
        return;
      }

      res.writeHead(200);
      res.end(GIF1x1);
    };

    let size = await probe(url + '/path/to/step1.gif');

    assert.strictEqual(size.url, url + '/path/step3.gif');
    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('should accept gzip-encoded output when not requested by client', async function () {
    let encoding;

    responder = function (req, res) {
      encoding = req.headers['accept-encoding'] || 'identity';
      res.setHeader('content-encoding', 'gzip');
      res.writeHead(200);
      res.end(zlib.gzipSync(GIF1x1));
    };

    let size = await probe(url + '/empty.gif');

    // make sure client requested no compression
    assert.strictEqual(encoding, 'identity');

    assert.strictEqual(size.width, 1);
    assert.strictEqual(size.height, 1);
    assert.strictEqual(size.mime, 'image/gif');
  });

  it('does not duplicate listeners on .end', async function () {
    await probe(url + '/path/to/step1.gif', function (err) {
      if (err) throw err;

      // lets go through all sockets and inspect all socket objects
      for (let hostTarget in httpAgent.sockets) {
        // normally, there are 2 internal listeners and 1 needle sets up,
        // but to be sure the test does not fail even if newer node versions
        // introduce additional listeners, we use a higher limit.
        if (hostTarget) {
          httpAgent.sockets[hostTarget].forEach(function (socket) {
            socket.listeners('end').length.should.be.below(5, "too many listeners on the socket object's end event");
          });
        }
      }
    });
  });

  it('should not parse application/json', async function () {
    // regression test for #62, http library might decide to parse this
    responder = function (req, res) {
      res.setHeader('content-type', 'application/json');
      res.writeHead(200);
      res.end('{ "test": 123 }');
    };

    await assert.rejects(() => probe(url + '/test.json'), /unrecognized file format/);
  });

  after(function () {
    httpAgent.destroy();
    srv.close();
  });
});
