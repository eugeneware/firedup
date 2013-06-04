var expect = require('chai').expect
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , bytewise = require('byteup')()
  , sublevel = require('level-sublevel')
  , livestream = require('level-live-stream')
  , _ = require('underscore')
  , levelplus = require('levelplus')
  , async = require('async');

describe('firedup', function () {
  var dbPath = path.join(__dirname, '..', 'data', 'test');
  var db;

  beforeEach(function (done) {
    rimraf.sync(dbPath)
    db = levelup(dbPath, { keyEncoding: 'bytewise', valueEncoding: 'json' },
      function (err) {
        db = levelplus(db);
        db = sublevel(db);
        done();
      });
  });

  afterEach(function (done) {
    db.close(done);
  });

  function urlPut(db, url, data, cb) {
    var parts = url.split('/');
    propPut(db, parts, data, cb);
  }

  function saveObj(parts, data) {
    var ops = [];
    if (typeof data === 'object') {
      Object.keys(data).forEach(function (key) {
        var value = data[key];
        if (typeof value === 'object') {
          ops = ops.concat(saveObj(parts.concat(key), value));
        } else {
          ops.push({ type: 'put', key: parts.concat(key), value: data[key] });
        }
      });
    } else {
      ops = { type: 'put', key: parts, value: data };
    }
    return ops;
  }

  /**
   * /users/eugene/name : 'Eugene'
   * /users/eugene/name : { first: 'Eugene', last: 'Ware' }
   *
   *   /users/eugene/name/first : 'Eugene'
   *   /users/eugene/name/last : 'Ware'
   */
  function propPut(db, parts, data, cb) {
    var ops;
    ops = saveObj(parts, data);
    db.batch(ops, cb);
  }

  it('should be able to store object data at rest locations', function (done) {
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
    urlPut(db, url, data, function (err) {
      if (err) return done(err);
      check();
    });

    var tests = [
      { key: ['users', 'eugene', 'name'], expected: 'Eugene' },
      { key: ['users', 'eugene', 'number'], expected: 42 },
      { key: ['users', 'eugene', 'tags', '2'], expected: 'hello' },
      { key: ['users', 'eugene', 'key', 'private'], expected: 'my private key' },
      { key: ['users', 'eugene', 'key', 'mykeys', '0'], expected: 'public' }
    ];

    function check () {
      var count = tests.length;
      tests.forEach(function (test) {
        db.get(test.key, function (err, data) {
          expect(data).to.deep.equals(test.expected);
          --count || done();
        });
      });
    }
  });
});
