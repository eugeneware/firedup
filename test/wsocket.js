var expect = require('chai').expect
  , http = require('http')
  , levelup = require('levelup')
  , _ = require('underscore')
  , io = require('socket.io')
  , ioClient = require('socket.io-client')
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
    server = http.createServer(app).listen(port, function (err) {
      if (err) return done(err);
      socketServer = io.listen(server, { log: false });
      done();
    });
  });

  afterEach(function (done) {
    server.close();
    done();
  });

  it('should be able to fetch a page from the server', function (done) {
    request('http://localhost:3000/', function (err, res, body) {
      if (err) return done(err);
      expect(body).to.match(/<html>/);
      done();
    });
  });

  it('should be able to run websocket on the server', function (done) {
    socketServer.sockets.on('connection', function (socket) {
      socket.emit('greeting', { msg: 'hi' });
      socket.on('response', function (data) {
        expect(data.msg).to.equal('oi');
      });
    });

    var socket = ioClient.connect('ws://localhost:3000');
    socket.emit('response', { msg: 'oi' });
    socket.on('greeting', function (data) {
      expect(data.msg).to.equal('hi');
      done();
    });
  });
});
