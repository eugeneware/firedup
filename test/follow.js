var expect = require('chai').expect
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , bytewise = require('byteup')()
  , sublevel = require('level-sublevel')
  , livestream = require('level-live-stream')
  , _ = require('underscore')
  , levelplus = require('levelplus');

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

  it('should be able to follow changes', function (done) {
    var count = 20;

    doInsert(0, 10, function (err) {
      if (err) return done(err);
      livestream(db, {
          start: ['users', -Infinity],
          end: ['users', Infinity],
          old: true
        }).on('data', function (data) {
          --count || done();
        });

      doInsert(0, 10);
    });

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
