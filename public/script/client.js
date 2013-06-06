var app = angular.module('FiredUpChangesApp', []);
app.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
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
    }
  };
});
app.controller('FiredUpChangesCtrl', function ($scope, $http, socket) {
  socket.emit('listen', 'test');
  socket.on('value', function (data) {
    $scope.items = data;
  });
  $scope.items = [];
  /*
  $http.get('/db/test')
    .then(function (results) {
      $scope.items = results.data;
    });
  */
});
