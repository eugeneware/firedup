var http = require('http')
  , connect = require('connect')
  , path = require('path')
  , levelup = require('levelup')
  , firedup = require('./lib/firedup')
  , firedupServer = require('./lib/firedupserver')

var dbPath = path.join(__dirname, 'data', 'test');
var db = firedup(levelup(dbPath));

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.query())
  .use(firedupServer(db, '/db'))
  .use(connect.static(__dirname + '/public'));

var port = parseInt(process.argv[2]) || 3000;
app.listen(port);
console.log('Listening on port ' + port);
