var expect = require('chai').expect
  , rimraf = require('rimraf')
  , levelup = require('levelup')
  , firedup = require('../lib/firedup')
  , path = require('path')
  , spawn = require('child_process').spawn
  , request = require('request');

describe('server', function() {
  var db, app;
  var dbPath = path.join(__dirname, '..', 'data', 'test');
  var serverPort = 4000;
  var serverEndpoint = 'http://localhost:' + serverPort + '/db/';

  beforeEach(function (done) {
    rimraf.sync(dbPath)
    db = firedup(levelup(dbPath));
    insertData();

    function insertData() {
      var url = 'users/eugene';
      var data = {
        name: 'Eugene',
        number: 42,
        tags: ['awesome', 'tags', 'hello'],
        key: {
          public: 'my public key',
          private: 'my private key',
          mykeys: ['public', 'private']
        }
      };
      db.urlPut(url, data, close);
    }

    function close() {
      db.close(startServer);
    }

    function startServer() {
      app = spawn('node', [path.join(__dirname, '..', 'app.js'), serverPort]);
      //app.stdout.pipe(process.stdout);
      //app.stderr.pipe(process.stderr);
      app.stdout.once('data', function () {
        done();
      });
    }
  });

  afterEach(function (done) {
    app.kill();
    app.on('close', function (code) {
      done();
    });
  });

  it('should be able to read data from the server', function (done) {
    request(serverEndpoint + 'users',
      function (err, res, body) {
        if (err) return done(err);
        var results = JSON.parse(body);
        expect(results.eugene.tags[1]).to.equal('tags');
        done();
      });
  });

  it('should be able to do JSONP data from the server', function (done) {
    function doCallback(results) {
      expect(results.eugene.tags[1]).to.equal('tags');
      done();
    }
    request(serverEndpoint + 'users?callback=doCallback',
      function (err, res, body) {
        if (err) return done(err);
        eval(body);
      });
  });

  it('should be able to do JSON pretty printing', function (done) {
    request(serverEndpoint + 'users?print=pretty',
      function (err, res, body) {
        if (err) return done(err);
        var results = JSON.parse(body);
        expect(body).to.match(/      "/);
        expect(results.eugene.tags[1]).to.equal('tags');
        done();
      });
  });

  it('should be able to store data to the server', function (done) {
    request({
        method: 'PUT',
        url: serverEndpoint + 'users/eugene/name',
        body: '"Eugene Ware"'
      },
      function (err, res, body) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(200);
        var obj = JSON.parse(body);
        expect(obj).to.equal('Eugene Ware');
        check();
      });

    function check() {
      request(serverEndpoint + 'users',
        function (err, res, body) {
          if (err) return done(err);
          expect(res.statusCode).to.equal(200);
          var results = JSON.parse(body);
          expect(results.eugene.name).to.equal('Eugene Ware');
          done();
        });
    }
  });

  it('should be able to delete from the server', function (done) {
    request({
        method: 'DELETE',
        url: serverEndpoint + 'users/eugene/name',
        body: '"Eugene Ware"'
      },
      function (err, res, body) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(204);
        expect(body).to.equal('');
        check();
      });

    function check() {
      request(serverEndpoint + 'users',
        function (err, res, body) {
          if (err) return done(err);
          expect(res.statusCode).to.equal(200);
          var results = JSON.parse(body);
          expect(results.eugene.name).to.not.exist;
          done();
        });
    }
  });

  it('should be able to push data to the server', function (done) {
    var data = {
      name: 'Susan Ware',
      age: 23
    };

    var _name;
    request({
        method: 'POST',
        url: serverEndpoint + 'users',
        body: JSON.stringify(data)
      },
      function (err, res, body) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(200);
        _name = JSON.parse(body).name;
        check();
      });

    function check() {
      request(serverEndpoint + 'users',
        function (err, res, body) {
          if (err) return done(err);
          expect(res.statusCode).to.equal(200);
          var results = JSON.parse(body);
          expect(results.eugene.name).to.equal('Eugene');
          expect(results[_name].name).to.equal('Susan Ware');
          expect(results[_name].age).to.equal(23);
          done();
        });
    }
  });
});
