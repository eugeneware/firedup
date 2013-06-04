var livestream = require('level-live-stream')
  , toSlice = require('levelup/lib/util').toSlice
  , Stream = require('stream')
  , deepEquals = require('deep-equal');

module.exports = function (db) {
  db.urlPut = urlPut.bind(null, db);
  db.urlGet = urlGet.bind(null, db);
  db.urlPush = urlPush.bind(null, db);
  db.urlWatch = urlWatch.bind(null, db);

  function urlWatch(db, url) {
    var s = new Stream;
    var parts = url.split('/');
    var encodedStart, encodedEnd;
    var checker = function(key) {
      var encodedKey = toSlice[db.options.keyEncoding](key);
      return encodedKey >= encodedStart && encodedKey <= encodedEnd;
    }
    checker.old = false;
    checker.start = parts.concat(null);
    checker.end = parts.concat(undefined);
    encodedStart = toSlice[db.options.keyEncoding](checker.start);
    encodedEnd = toSlice[db.options.keyEncoding](checker.end);

    s.readable = true;

    var cache;
    propGet(db, parts, function (err, data) {
      cache = data;
      s.emit('value', data);
      livestream(db, checker)
        .on('data', function (ch) {
          cache = updateObj(parts, cache, ch);
          if (ch.type === 'put') {
            // should only be immediate children
            s.emit('child_added', ch);
          } else if (ch.type === 'del') {
            // should only be immediate children
            s.emit('child_removed', ch);
          }
          s.emit('value', cache);
        })
        .on('end', function () {
          s.emit('end');
        });
    });

    return s;
  }

  function urlPush(db, url, data, cb) {
    var parts = url.split('/');
    var hr = process.hrtime();
    var key = hr[0]*1e9 + hr[1];
    db.put(parts.concat(key), data, cb);
    return key;
  }

  function urlPut(db, url, data, cb) {
    var parts = url.split('/');
    propPut(db, parts, data, cb);
  }

  function deleteChildren(db, parts, cb) {
    var ops = [];
    db.createReadStream({
        start: parts.concat(null),
        end: parts.concat(undefined)
      })
      .on('data', function (data) {
        ops.push({ type: 'del', key: data.key });
      })
      .on('end', function () {
        cb(null, ops);
      });
  }

  function saveObj(db, parts, data, cb) {
    var ops = [];
    if (typeof data === 'object') {
      deleteChildren(db, parts, function (err, _ops) {
        ops = ops.concat(_ops);
        saveChildren();
      });

      function saveChildren() {
        var keys = Object.keys(data);
        var count = keys.length;
        keys.forEach(function (key) {
          var value = data[key];
          if (typeof value === 'object') {
            saveObj(db, parts.concat(key), value, function (err, _ops) {
              ops = ops.concat(_ops);
              --count || cb(null, ops);
            });
          } else {
            ops.push({ type: 'put', key: parts.concat(key), value: data[key] });
            --count || cb(null, ops);
          }
        });
      }
    } else {
      ops.push({ type: 'put', key: parts, value: data });
      cb(null, ops);
    }
  }

  function propPut(db, parts, data, cb) {
    saveObj(db, parts, data, function (err, ops) {
      db.batch(ops, cb);
    });
  }

  function urlGet(db, url, cb) {
    var parts = url.split('/');
    propGet(db, parts, cb);
  }

  function propGet(db, parts, cb) {
    var work = 0;
    var obj = {};
    db.get(parts, function (err, data) {
      if (!err) {
        cb(null, data);
      } else if (err && err.name === 'NotFoundError') {
        db.createReadStream({
            start: parts.concat(null),
            end: parts.concat(undefined)
          })
          .on('data', function (data) {
            work++;
            obj = updateObjPut(parts, obj, data);
          })
          .on('end', function () {
            cb(null, obj);
          });
      } else {
        cb(err);
      }
    });
  }

  function updateObj(parts, obj, ch) {
    if (ch.type === 'put') {
      obj = updateObjPut(parts, obj, ch);
    } else if (ch.type === 'del') {
      obj = updateObjDel(parts, obj, ch);
    }

    return obj;
  }

  function updateObjPut(parts, obj, ch) {
    var _keys = ch.key.slice(parts.length)
    var ptr = obj;
    _keys.forEach(function (_key, i) {
      if (typeof ptr !== 'object') {
        return;
      }

      if (!(_key in ptr)) {
        ptr[_key] = {};
      }
      if (i < _keys.length - 1) {
        ptr = ptr[_key];
      } else {
        ptr[_key] = ch.value;
      }
    });

    return obj;
  }

  function updateObjDel(parts, obj, ch) {
    var _keys = ch.key.slice(parts.length)
    var ptr = obj;
    _keys.forEach(function (_key, i) {
      if (typeof ptr !== 'object') {
        return;
      }

      if (!(_key in ptr)) {
        ptr[_key] = {};
      }
      if (i < _keys.length - 1) {
        ptr = ptr[_key];
      } else {
        delete ptr[_key];
      }
    });

    return obj;
  }

  return db;
};
