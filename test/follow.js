var expect = require('chai').expect
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , _ = require('underscore')
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

  it('should be able to follow changes', function (done) {
    var count = 21;

    doInsert(0, 10, function (err) {
      if (err) return done(err);
      var once = true;
      db.urlWatch('users')
        .on('child_added', function (data) {
          --count || done();
        })
        .on('child_removed', function (data) {
          --count || done();
        })
        .on('child_changed', function (data) {
          --count || done();
        })
        .on('value', function (data) {
          if (once) {
            expect(Object.keys(data).length).to.equal(10);
            once = false;
            doInsert(10, 10, function (err) {
              if (err) return done(err);
              doDelete(0, 10, function (err) {
                if (err) return done(err);
                db.put(['users', 17], { name: 'User 17', number: 'changed' });
              });
            });
          }
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
