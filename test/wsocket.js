var expect = require('chai').expect
  , levelup = require('levelup')
  , _ = require('underscore')
  , eio = require('engine.io')
  , eioClient = require('engine.io-client')
  , http = require('http')
  , request = require('request')
  , connect = require('connect')
  , path = require('path');

describe('websockets', function () {
  var app, server, socketServer;
  var port = 3000;

  beforeEach(function (done) {
    app = connect()
      .use(connect.query())
      .use(connect.static(path.join(__dirname, '..', 'public')));
    server = app.listen(port, function (err) {
      if (err) return done(err);
      socketServer = eio.attach(server);
      done();
    });
  });

  afterEach(function (done) {
    server.close(done);
  });

  it('should be able to fetch a page from the server', function (done) {
    request('http://localhost:3000/', function (err, res, body) {
      if (err) return done(err);
      expect(body).to.match(/<html>/);
      done();
    });
  });

  it('should be able to run websocket on the server', function (done) {
    socketServer.on('connection', function (socket) {
      socket.send('hi');
      socket.on('message', function (data) {
        expect(data).to.equal('bob');
      });
    });

    var socket = eioClient('ws://localhost:3000');
    socket.on('open', function () {
      socket.send('bob');
      socket.on('message', function (data) {
        expect(data).to.equal('hi');
        done();
      });
    });
  });
});
