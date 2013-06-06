var expect = require('chai').expect
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , _ = require('underscore')
  , async = require('async')
  , firedup = require('../lib/firedup');

describe('firedup', function () {
  var dbPath = path.join(__dirname, '..', 'data', 'test');
  var db;

  beforeEach(function (done) {
    rimraf.sync(dbPath)
    db = firedup(levelup(dbPath));
    done();
  });

  afterEach(function (done) {
    db.close(done);
  });

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
    db.urlPut(url, data, function (err) {
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

  it('should be able to retrieve object data at rest locations', function (done) {
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
    db.urlPut(url, data, function (err) {
      if (err) return done(err);
      check();
    });

    var tests = [
      { key: 'users/eugene/name', expected: 'Eugene' },
      { key: 'users/eugene/number', expected: 42 },
      { key: 'users/eugene/tags/2', expected: 'hello' },
      { key: 'users/eugene/key/private', expected: 'my private key' },
      { key: 'users/eugene/key/mykeys/0', expected: 'public' }
    ];

    function check () {
      var count = tests.length;
      tests.forEach(function (test) {
        db.urlGet(test.key, function (err, data) {
          expect(data).to.deep.equals(test.expected);
          --count || done();
        });
      });
    }
  });

  it('should be able to retrieve structured data at rest locations', function (done) {
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
    db.urlPut(url, data, function (err) {
      if (err) return done(err);
      check();
    });

    var tests = [
      { key: 'users/eugene', expected: data },
      { key: 'users/eugene/tags', expected: ['awesome', 'tags', 'hello'] },
      { key: 'users/eugene/key', expected: {
          public: 'my public key',
          private: 'my private key',
          mykeys: ['public', 'private'] } },
      { key: 'users/eugene/key/mykeys', expected: ['public', 'private'] }
    ];

    function check () {
      var count = tests.length;
      tests.forEach(function (test) {
        db.urlGet(test.key, function (err, data) {
          expect(data).to.deep.equals(test.expected);
          --count || done();
        });
      });
    }
  });

  it('should be able to work with array replacmenent', function (done) {
    var url = 'test';
    var data = ['awesome', 'tags', 'hello'];
    db.urlPut(url, data, function (err) {
      if (err) return done(err);
      next();
    });

    function next() {
      var data = ['goodbye'];
      db.urlPut(url, data, function (err) {
        if (err) return done(err);
        check();
      });
    }

    var tests = [
      { key: 'test', expected: ['goodbye'] }
    ];

    function check () {
      var count = tests.length;
      tests.forEach(function (test) {
        db.urlGet(test.key, function (err, data) {
          expect(data).to.deep.equals(test.expected);
          --count || done();
        });
      });
    }
  });

  it('should be able to work with object replacement', function (done) {
    var data = {
      name: 'Eugene',
      tags: ['tag1', 'tag2']
    };
    db.urlPut('test', data, function (err) {
      if (err) return done(err);
      next();
    });

    function next() {
      var data = 'nothing here';
      db.urlPut('test/tags', data, function (err) {
        if (err) return done(err);
        check();
      });
    }

    var tests = [
      { key: 'test/tags', expected: 'nothing here' },
      { key: 'test', expected: { name: 'Eugene', tags: 'nothing here' } }
    ];

    function check () {
      var count = tests.length;
      tests.forEach(function (test) {
        db.urlGet(test.key, function (err, data) {
          expect(data).to.deep.equals(test.expected);
          --count || done();
        });
      });
    }
  });

  it('should be able to push to an url array', function (done) {
    var work = _.range(0, 10).map(function (i) {
      return db.urlPush.bind(db, 'test', { name: 'Name ' + i, num: i });
    });

    async.parallel(work, function (err) {
      db.urlGet('test', function (err, results) {
        Object.keys(results).forEach(function (key) {
          var value = results[key];
          expect(value.name).to.match(/^Name \d+$/);
          expect(value.num).to.be.gte(0);
          expect(value.num).to.be.lte(10);
        });
        done();
      });
    });
  });

  it('should be able to delete from a url', function (done) {
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
    db.urlPut(url, data, function (err) {
      if (err) return done(err);
      doDelete();
    });

    function doDelete() {
      db.urlDel('users/eugene/key', function (err) {
        check();
      });
    }

    var tests = [
      { key: 'users/eugene/key', expected: undefined },
      { key: 'users/eugene/key/mykeys', expected: undefined },
      { key: 'users/eugene/tags', expected: ['awesome', 'tags', 'hello'] }
    ];

    function check () {
      var count = tests.length;
      tests.forEach(function (test) {
        db.urlGet(test.key, function (err, data) {
          expect(data).to.deep.equals(test.expected);
          --count || done();
        });
      });
    }
  })
});
