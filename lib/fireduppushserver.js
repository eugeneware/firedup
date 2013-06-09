var getUrlTail = require('./urltail')
  , uid = require('./uid')
  , ioRpc = require('./iorpc');

exports.connect = connect;
function connect(db, dbPrefix, webSocketServer) {
  ioRpc(webSocketServer, {
    'uid': function (cb) {
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
