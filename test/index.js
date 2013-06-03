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
    propPut(db, parts, data, cb);
  }

  function propPut(db, parts, data, cb) {
    noop = function noop () {};
    var _data = JSON.parse(JSON.stringify(data));
    if (typeof data === 'object' && data instanceof Array) {
      var count = 0;
      Object.keys(data).forEach(function (key) {
        var value = data[key];
        count++;
        propPut(db, parts.concat(key), value, function (err) {
          if (err) return cb(err);
          --count || cb();
        });
      });
    } else {
      if (typeof data === 'object') {
        Object.keys(data).forEach(function (key) {
          var value = data[key];
          if (typeof value === 'object') {
            delete _data[key];
            propPut(db, parts.concat(key), value, noop);
          }
        });
      }
      db.put(parts, _data, cb);
    }
  }

  function urlPush(db, url, data, cb) {
    var parts = url.split('/');
    db.push(parts, data, cb);
  }

  function urlGet(db, url, cb) {
    function noop() {}
    var parts = url.split('/');
    propGet(db, parts, [], function (err, data) {
      if (err && err.name === 'NotFoundError') {
        parts = url.split('/');
        var obj = {};
        var count = 0;
        db.createReadStream({
          start: parts.concat(null),
          end: parts.concat(undefined)
        })
          .on('data', function (data) {
            if (data.key.length === parts.length + 1) {
              count++;
              propGet(db, data.key, [], function (err, result) {
                obj[data.key[data.key.length - 1]] = result;
                if (err) return cb(err);
                --count || cb(null, obj);
              });
            }
          })
          .on('end', function () {
            if (count === 0) cb(err, data);
          });
      } else {
        cb(err, data);
      }
    });
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
      var tests = [
        { path: 'users/eugene/name', expected: 'Eugene' },
        { path: 'users/eugene/number', expected: 42 },
        { path: 'users/eugene/number/32', expected: undefined }
      ];

      var count = tests.length;
      tests.forEach(function (test) {
        urlGet(db, test.path, function (err, data) {
          expect(data).to.equal(test.expected);
          --count || done();
        });
      });
    });
  });

  it('should be able to write structured data', function (done) {
    var url = 'users/eugene';
    urlPut(db, url, { name: 'Eugene', number: 42, todos: ['a', 'b', 'c'] },
      function (err) {
        if (err) return done(err);
        var tests = [
          { path: 'users/eugene/todos', expected: ['a', 'b', 'c'] },
          { path: 'users/eugene/todos/1', expected: 'b' },
          { path: 'users/eugene/number', expected: 42 },
          { path: 'users/eugene/name', expected: 'Eugene' },
        ];

        var count = tests.length;
        tests.forEach(function (test) {
          urlGet(db, test.path, function (err, data) {
            expect(data).to.deep.equal(test.expected);
            --count || done();
          });
        });
      });
  });
});
