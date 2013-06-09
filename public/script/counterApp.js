var app = angular.module('CounterApp', ['firedup', 'socket.io']);
app.controller('CounterCtrl', function ($scope, firedUp) {
  $scope.counter = 0;
  firedUp('/db/counter', $scope, 'counter', 0)
    .then(function(server) {
      server.pushRef(function (err, data) {
        console.log('pushRef returned: ', err, data);
      });
      $scope.inc = function() {
        $scope.counter++;
      };
      $scope.dec = function() {
        $scope.counter--;
      };
    });
});
