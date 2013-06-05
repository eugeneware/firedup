var expect = require('chai').expect
  , rimraf = require('rimraf')
  , levelup = require('levelup')
  , firedup = require('../lib/firedup')
  , sublevel = require('level-sublevel')
  , bytewise = require('byteup')()
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
    db = levelup(dbPath, { keyEncoding: 'bytewise', valueEncoding: 'json' },
      function (err) {
        db = firedup(db);
        db = sublevel(db);
        insertData();
      });

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
});
