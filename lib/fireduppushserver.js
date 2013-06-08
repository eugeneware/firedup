var getUrlTail = require('./urltail');

exports.connect = connect;
function connect(db, dbPrefix, webSocketServer) {
  webSocketServer.sockets.on('connection', function (socket) {
    socket.on('listen', function (url) {
      var dbUrl = getUrlTail(dbPrefix, url);
      db.urlWatch(dbUrl)
        .on('value', function (data) {
          socket.emit('value', data);
        });
    });
  });
}
