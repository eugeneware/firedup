var expect = require('chai').expect
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , bytewise = require('byteup')()
  , sublevel = require('level-sublevel')
  , _ = require('underscore')
  , levelplus = require('levelplus')
  , async = require('async')
  , firedup = require('../lib/firedup');

describe('firedup', function () {
  var dbPath = path.join(__dirname, '..', 'data', 'test');
  var db;

  beforeEach(function (done) {
    rimraf.sync(dbPath)
    db = levelup(dbPath, { keyEncoding: 'bytewise', valueEncoding: 'json' },
      function (err) {
        db = levelplus(db);
        db = firedup(db);
        db = sublevel(db);
        done();
      });
  });

  afterEach(function (done) {
    db.close(done);
  });

  it('should be able to follow changes', function (done) {
    var count = 20;

    doInsert(0, 10, function (err) {
      if (err) return done(err);
      db.urlWatch('users')
        .on('child_added', function (data) {
          --count || done();
        })
        .on('child_removed', function (data) {
          --count || done();
        })
        .on('value', function (data) {
          expect(Object.keys(data).length).to.equal(10);
          doInsert(0, 10, function (err) {
            if (err) return done(err);
            doDelete(0, 10);
          });
        });
    });

    function doDelete(offset, n, cb) {
      var count = n;
      _.range(offset, offset + n).forEach(function (i) {
        db.del(['users', i], function (err) {
          if (err) return cb(err);
          --count || cb && cb();
        });
      });
    }

    function doInsert(offset, n, cb) {
      var count = n;
      _.range(offset, offset + n).forEach(function (i) {
        db.put(['users', i], { name: 'User ' + i, number: i }, function (err) {
          if (err) return cb(err);
          --count || cb && cb();
        });
      });
    }
  });
});
