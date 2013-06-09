module.exports = connect;
function connect(socket, options, fns) {
  if (!fns) fns = options;
  options = options || {};
  options.request = options.request || 'apiCall';
  options.response = options.response || 'apiResponse';

  socket.on(options.request, function (msg) {
    if (msg.name in fns) {
      try {
        fns[msg.name].apply(null, msg.data.concat(function (err, data) {
          if (err) err = { name: err.name, message: err.message };
          socket.emit(options.response, err, msg.id, data);
      }));
      } catch (err) {
        socket.emit(options.response, { name: err.name, message: err.message }, msg.id, null);
      }
    } else {
      socket.emit(options.response, { name: 'MethodNotFound', message: msg.name }, msg.id, null);
    }
  });
}
