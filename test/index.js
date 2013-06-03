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

  function urlPut(db, url, data, cb) {
    var parts = url.split('/');
    db.put(parts, data, cb);
  }

  function urlPush(db, url, data, cb) {
    var parts = url.split('/');
    db.push(parts, data, cb);
  }

  function urlGet(db, url, cb) {
    var parts = url.split('/');
    propGet(db, parts, [], cb);
  }

  function propGet(db, parts, props, cb) {
    db.get(parts, function (err, data) {
      if (err && err.name === 'NotFoundError') {
        var prop = parts.pop();
        props.push(prop);
        propGet(db, parts, props, cb);
      } else {
        if (props.length === 0) {
          cb(err, data);
        } else {
          var target = data;
          var notFound = false;
          props.forEach(function (prop) {
            if (prop in target) {
              target = target[prop];
            } else {
              notFound = true;
              cb({ name: 'NotFoundError', messsage: 'Key not found' });
            }
          });

          if (!notFound) { // prevent double callbacks
            if (target !== undefined) {
              cb(err, target);
            } else {
              cb({ name: 'NotFoundError', messsage: 'Key not found' });
            }
          }
        }
      }
    });
  }

  it('should be able to store object data at rest locations', function (done) {
    var url = 'users/eugene';
    urlPut(db, url, { name: 'Eugene', number: 42 }, function (err) {
      if (err) return done(err);
      urlGet(db, url, function (err, data) {
        expect(data).deep.equals({ name: 'Eugene', number: 42 });
        done();
      });
    });
  });

  it('should be able to push arrays at rest locations', function (done) {
    var url = 'users';
    urlPush(db, url, { name: 'Eugene', number: 42 }, function (err) {
      if (err) return done(err);
      urlGet(db, url, function (err, data) {
        expect(data[0]).deep.equals({ name: 'Eugene', number: 42 });
        done();
      });
    });
  });

  it('should be able to get properties', function (done) {
    var url = 'users/eugene'
    urlPut(db, url, { name: 'Eugene', number: 42 }, function (err) {
      if (err) return done(err);
      var count = 3;
      urlGet(db, 'users/eugene/name', function (err, data) {
        expect(data).to.equal('Eugene');
        --count || done();
      });
      urlGet(db, 'users/eugene/number', function (err, data) {
        expect(data).to.equal(42);
        --count || done();
      });
      urlGet(db, 'users/eugene/number/32', function (err, data) {
        expect(err).to.exist;
        expect(err.name).to.equal('NotFoundError');
        expect(data).to.not.exist;
        --count || done();
      });
    });
  });
});
