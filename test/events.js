var expect = require('chai').expect
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , _ = require('underscore')
  , firedup = require('../lib/firedup')
  , async = require('async');

describe('firedup events', function () {
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
    var count = 31;

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
        db.urlDel('users/' + i, function (err) {
          if (err) return cb(err);
          --count || cb && cb();
        });
      });
    }

    function doInsert(offset, n, cb) {
      var count = n;
      _.range(offset, offset + n).forEach(function (i) {
        db.urlPut('users/' + i, { name: 'User ' + i, number: i }, function (err) {
          if (err) return cb(err);
          --count || cb && cb();
        });
      });
    }
  });

  it('should be able to follow changes of child values', function (done) {
    var added = 0, removed = 0, changed = 0, valued = 0;

    db.urlWatch('users/eugene')
      .on('child_added', function (data) {
        added++;
        check();
      })
      .on('child_removed', function (data) {
        removed++;
        check();
      })
      .on('child_changed', function (data) {
        changed++;
        check();
      })
      .on('value', function (data) {
        valued++;
        check();
      })
      .once('value', put);

    function put() {
      var names = ['Eugene Ware', 'Susan Ware', 'Edmund Ware'];
      async.mapSeries(names, function (name, cb) {
        db.urlPut('users/eugene/name', name, cb);
      }, del);
    }

    function del() {
      db.urlDel('users/eugene/name');
    }

    function check() {
      if (added == 0 && removed == 1 && changed == 2 && valued == 4) {
        done();
      }
    }
  });

  it('should be able to follow changes of values', function (done) {
    var added = 0, removed = 0, changed = 0, valued = 0;

    db.urlWatch('users/eugene/name')
      .on('child_added', function (data) {
        added++;
        check();
      })
      .on('child_removed', function (data) {
        removed++;
        check();
      })
      .on('child_changed', function (data) {
        changed++;
        check();
      })
      .on('value', function (data) {
        valued++;
        check();
      })
      .once('value', put);

    function put() {
      var names = ['Eugene Ware', 'Susan Ware', 'Edmund Ware'];
      async.mapSeries(names, function (name, cb) {
        db.urlPut('users/eugene/name', name, cb);
      }, del);
    }

    function del() {
      db.urlDel('users/eugene/name');
    }

    function check() {
      if (added == 0 && removed == 0 && changed == 0 && valued == 5) {
        done();
      }
    }
  });
});
