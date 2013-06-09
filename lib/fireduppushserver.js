var getUrlTail = require('./urltail')
  , uid = require('./uid')
  , ioRpc = require('./iorpc');

exports.connect = connect;
function connect(db, dbPrefix, webSocketServer) {
  ioRpc(webSocketServer, {
    'get': function (url, cb) {
      var dbUrl = getUrlTail(dbPrefix, url);
      return db.urlGet(dbUrl, cb);
    },
    'put': function (url, data, cb) {
      var dbUrl = getUrlTail(dbPrefix, url);
      return db.urlPut(dbUrl, data, cb);
    },
    'push': function (url, data, cb) {
      var dbUrl = getUrlTail(dbPrefix, url);
      return db.urlPush(dbUrl, data, cb);
    },
    'del': function (url, data, cb) {
      var dbUrl = getUrlTail(dbPrefix, url);
      return db.urlDel(dbUrl, data, cb);
    },
    'pushRef': function (cb) {
      cb(null, uid());
    },
    'listen': function (url, cb) {
      var socket = this.socket;
      var dbUrl = getUrlTail(dbPrefix, url);
      db.urlWatch(dbUrl)
        .on('value', function (data) {
          socket.emit('value', data);
        });
      cb(null);
    }
  });
}
