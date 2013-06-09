angular.module('socket.io', []).factory('socket', function ($rootScope, $q) {
  var d = $q.defer();
  var socket = io.connect();
  var fns = [];
  var rpcId = 0;
  var rpcCbs = {};
  var ngSock = {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    },
    apiCall: function (methodName) {
      var args = Array.prototype.slice.call(arguments);
      args.shift();
      var cb = args.pop();
      rpcId++;
      var msgId = rpcId;
      ngSock.emit('apiCall', {
        id: msgId,
        name: methodName,
        data: args
      });
      rpcCbs[msgId] = cb;
    },
    remote: {}
  };
  ngSock.on('remote', function (fns_) {
    fns = fns_;
    fns.forEach(function (fnName) {
      ngSock.remote[fnName] = ngSock.apiCall.bind(null, fnName);
    });
    d.resolve(ngSock);
  });
  ngSock.on('apiResponse', function (err, id, data) {
    var cb = rpcCbs[id];
    delete rpcCbs[id];
    cb(err, data);
  });

  return d.promise;
});
