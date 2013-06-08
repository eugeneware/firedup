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
        try {
          fns[msg.name].apply(null, msg.data.concat(function (err, data) {
            if (err) err = { name: err.name, message: err.message };
            socket.emit('apiResponse', err, msg.id, data);
        }));
        } catch (err) {
          socket.emit('apiResponse', { name: err.name, message: err.message }, msg.id, null);
        }
      } else {
        socket.emit('apiResponse', { name: 'MethodNotFound', message: msg.name }, msg.id, null);
      }
    });
  });
}
