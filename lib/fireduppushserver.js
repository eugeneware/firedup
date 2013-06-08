var getUrlTail = require('./urltail')
  , uid = require('./uid');

exports.connect = connect;
function connect(db, dbPrefix, webSocketServer) {
  webSocketServer.sockets.on('connection', function (socket) {
    var fns = {
      'uid': function (cb) {
        cb(null, uid());
      },
      'listen': function (url, cb) {
        var dbUrl = getUrlTail(dbPrefix, url);
        db.urlWatch(dbUrl)
          .on('value', function (data) {
            socket.emit('value', data);
          });
        cb(null);
      }
    };

    socket.on('apiCall', function (msg) {
      if (msg.name in fns) {
        fns[msg.name].apply(null, msg.data.concat(function (err, data) {
          socket.emit('apiResponse', err, msg.id, data);
        }));
      } else {
        socket.emit('apiResponse', new Error('MethodNotFound: ' + msg.name), msg.id, null);
      }
    });
  });
}
