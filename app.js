var http = require('http')
  , connect = require('connect')
  , path = require('path')
  , levelup = require('levelup')
  , bytewise = require('byteup')()
  , firedup = require('./lib/firedup')
  , firedupServer = require('./lib/firedupserver')
  , firedupPushServer = require('./lib/fireduppushserver')
  , io = require('socket.io');

var dbPath = path.join(__dirname, 'data', 'test');
var db = firedup(levelup(dbPath));
var dbPrefix = '/db';

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.query())
  .use(firedupServer(db, dbPrefix))
  .use(connect.static(__dirname + '/public'));

var port = parseInt(process.argv[2]) || 3000;
var server = http.createServer(app).listen(port);
var webSocketServer = io.listen(server, { log: false });
firedupPushServer.connect(db, dbPrefix, webSocketServer);
console.log('Listening on port ' + port);
