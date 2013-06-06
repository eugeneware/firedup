var http = require('http')
  , connect = require('connect')
  , path = require('path')
  , levelup = require('levelup')
  , firedup = require('./lib/firedup')
  , firedupServer = require('./lib/firedupserver')

var db;
var dbPath = path.join(__dirname, 'data', 'test');
var dbPrefix = '/db';

db = firedup(levelup(dbPath));

function startServer() {
  var app = connect()
    .use(connect.logger('dev'))
    .use(connect.query())
    .use(firedupServer(db, dbPrefix))
    .use(connect.static(__dirname + '/public'));

  var port = parseInt(process.argv[2]) || 3000;
  app.listen(port);
  console.log('Listening on port ' + port);
}

startServer();
