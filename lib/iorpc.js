var util = require('util')
  , EventEmitter = require('events').EventEmitter;

module.exports = connect;
function connect(webSocketServer, options, fns) {
  if (!fns) fns = options;
  options = options || {};
  options.request = options.request || 'apiCall';
  options.response = options.response || 'apiResponse';
  options.remote = options.remote || 'remote';

  var server = new IoRpcServer;
  webSocketServer.sockets.on('connection', function (socket) {
    server.emit('connect', socket);
    socket.on('disconnect', function () {
      server.emit('disconnect');
    });

    socket.emit(options.remote, Object.keys(fns));

    var state = {
      socket: socket
    };

    function makeErr(err) {
      if (err && err.name && err.message) {
        return {
          name: err.name,
          message: err.message
        };
      } else {
        return err.toString();
      }
    }

    socket.on(options.request, function (msg) {
      if (msg.name in fns) {
        try {
          fns[msg.name].apply(state, msg.data.concat(function (err, data) {
            if (err) err = makeErr(err);
            socket.emit(options.response, err, msg.id, data);
        }));
        } catch (err) {
          socket.emit(options.response,
            makeErr(err), msg.id, null);
        }
      } else {
        socket.emit(options.response,
          { name: 'MethodNotFound', message: msg.name }, msg.id, null);
      }
    });
  });
  return server;
}

function IoRpcServer() {
}

util.inherits(IoRpcServer, EventEmitter);
