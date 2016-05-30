
'use strict';


var assert = require('assert');
var http   = require('http');
var URL    = require('url');
var probe  = require('../');


describe('probeHttp', function () {
  var responder, url, srv;

  before(function (callback) {
    srv = http.createServer(function (req, res) {
      responder(req, res);
    }).listen(callback);

    url = URL.format({
      protocol: 'http',
      hostname: srv.address().address,
      port:     srv.address().port,
      path:     '/'
    });
  });

  it('should process an image', function (callback) {
    responder = function (req, res) {
      res.writeHead(200);

      // 1x1 transparent gif
      res.write(new Buffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64'));

      // response never ends
    };

    probe(url, function (err, size) {
      assert.ifError(err);
      assert.equal(size.width, 1);
      assert.equal(size.height, 1);
      assert.equal(size.mime, 'image/gif');

      callback();
    });
  });

  it('should process an image (promise)', function () {
    responder = function (req, res) {
      res.writeHead(200);

      // 1x1 transparent gif
      res.write(new Buffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64'));

      // response never ends
    };

    return probe(url).then(function (size) {
      assert.equal(size.width, 1);
      assert.equal(size.height, 1);
      assert.equal(size.mime, 'image/gif');
    });
  });

  it('should return content-length', function (callback) {
    responder = function (req, res) {
      res.writeHead(200, { 'Content-Length': 1234 });

      // 1x1 transparent gif
      res.end(new Buffer('R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==', 'base64'));
    };

    probe(url, function (err, size) {
      assert.ifError(err);
      assert.equal(size.width, 1);
      assert.equal(size.height, 1);
      assert.equal(size.length, 1234);
      assert.equal(size.mime, 'image/gif');

      callback();
    });
  });

  // Check that client closes the connection after all parsers fail,
  //
  // NOTE: the server output should be large enough so all parsers
  //       that buffer data will have their first buffer filled
  //
  it('should abort request ASAP', function (callback) {
    responder = function (req, res) {
      res.writeHead(200);
      res.write('this is not an image file,');
      res.write('it\'s just a bunch of text');
      // response never ends
    };

    probe(url, function (err) {
      assert.equal(err.message, 'unrecognized file format');

      callback();
    });
  });

  it('should fail on 404', function (callback) {
    responder = function (req, res) {
      res.writeHead(404);
      res.write('not found');
      // response never ends
    };

    probe(url, function (err) {
      assert.equal(err.status, 404);

      callback();
    });
  });

  it('should fail on 404 (promise)', function () {
    responder = function (req, res) {
      res.writeHead(404);
      res.write('not found');
      // response never ends
    };

    return probe(url).then(
      function () {
        throw new Error('should not succeed');
      },
      function (err) {
        assert.equal(err.status, 404);
      });
  });

  it('should return error if url is invalid', function (callback) {
    probe('badurl', function (err) {
      assert(err.message.match(/Invalid URI/));

      callback();
    });
  });

  it('should return error if connection fails', function (callback) {
    responder = function (req, res) {
      res.destroy();
    };

    probe(url, function (err) {
      assert.equal(err.code, 'ECONNRESET');

      callback();
    });
  });
});
