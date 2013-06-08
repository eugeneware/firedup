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
  this.rpcId = 0;
  this.rpcCbs = {};
}

FiredUp.prototype.associate = function (scope, name, ret) {
  var self = this;
  var d = this.$q.defer();
  this.apiCall('listen', this.ref, function(err) { });
  var resolved = false;
  this.socket.on('value', function (data) {
    if (!resolved) {
      resolved = true;
      d.resolve(self);
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
  this.socket.on('apiResponse', function (err, id, data) {
    var cb = self.rpcCbs[id];
    delete self.rpcCbs[id];
    cb(err, data);
  });
  scope.$watch(name, function (newVal, oldVal) {
    if (!resolved) return;
    self.$http.put(self.ref, newVal);
  }, true);
  return d.promise;
};

FiredUp.prototype.apiCall = function (methodName) {
  var args = Array.prototype.slice.call(arguments);
  args.shift();
  var cb = args.pop();
  this.rpcId++;
  var msgId = this.rpcId;
  this.socket.emit('apiCall', {
    id: msgId,
    name: methodName,
    data: args
  });
  this.rpcCbs[msgId] = cb;
};
