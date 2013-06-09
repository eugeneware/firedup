angular.module('firedup', ['socket.io']).factory('firedUp',
  ['$q', '$timeout', '$parse', '$http', 'socket',
  function($q, $timeout, $parse, $http, socket) {
    return function(ref, scope, name, ret) {
      return socket.then(function (socket) {
        var fi = new FiredUp($q, $timeout, $parse, $http, socket, ref);
        return fi.associate(scope, name, ret);
      });
    };
  }
]);

function FiredUp($q, $timeout, $parse, $http, socket, ref) {
  this.ref = ref;
  this.$q = $q;
  this.$timeout = $timeout;
  this.$parse = $parse;
  this.$http = $http;
  this.socket = socket;
  this.rpcId = 0;
  this.rpcCbs = {};
}

FiredUp.prototype.associate = function (scope, name, ret) {
  var self = this;
  var d = this.$q.defer();
  this.socket.remote.listen(this.ref, function () { });
  var resolved = false;
  this.socket.on('value', function (data) {
    if (!resolved) {
      resolved = true;
      d.resolve(self.socket.remote);
    }
    if (angular.equals(data, self.$parse(name)(scope))) {
      return;
    }
    if (data === null) {
      data = ret;
    } else if (typeof data === 'object' && ret instanceof Array ) {
      data.length = Object.keys(data).length;
      data = Array.prototype.slice.call(data);
    }
    self.$parse(name).assign(scope, angular.copy(data));
  });
  scope.$watch(name, function (newVal, oldVal) {
    if (!resolved) return;
    self.$http.put(self.ref, newVal);
  }, true);
  return d.promise;
};
