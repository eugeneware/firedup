angular.module('firedup', ['socket.io']).factory('firedUp',
  ['$q', '$timeout', '$parse', '$http', 'socket',
  function($q, $timeout, $parse, $http, socket) {
    return function(ref, scope, name, ret) {
      var fi = new FiredUp($q, $timeout, $parse, $http, socket, ref);
      return fi.associate(scope, name, ret);
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
}

FiredUp.prototype.associate = function (scope, name, ret) {
  var self = this;
  var d = this.$q.defer();
  this.socket.emit('listen', this.ref);
  var resolved = false;
  this.socket.on('value', function (data) {
    if (!resolved) d.resolve();
    if (angular.equals(data, self.$parse(name)(scope))) {
      return;
    }
    if (typeof data === 'object' &&
        typeof ret === 'object' && ret instanceof Array) {
      if (data === null) {
        data = [];
      } else {
        data.length = Object.keys(data).length;
        data = Array.prototype.slice.call(data);
      }
    }
    self.$parse(name).assign(scope, angular.copy(data));
  });
  scope.$watch(name, function (newVal, oldVal) {
    self.$http.put(self.ref, newVal);
  }, true);
  return d.promise;
};
