var app = angular.module('FiredUpChangesApp', ['firedup', 'socket.io']);
app.controller('FiredUpChangesCtrl', function ($scope, $http, socket, firedUp) {
  $scope.items = [];

  var promise = firedUp('/db/test', $scope, 'items', []);
  promise.then(function () {
    $scope.addItem = function () {
      if ($scope.newItem) {
        $scope.items.push($scope.newItem);
        $scope.newItem = '';
      }
    };
  });
});
