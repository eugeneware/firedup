var http = require('http')
  , connect = require('connect')
  , urlrouter = require('urlrouter')
  , rimraf = require('rimraf')
  , path = require('path')
  , levelup = require('levelup')
  , bytewise = require('byteup')()
  , sublevel = require('level-sublevel')
  , livestream = require('level-live-stream')
  , firedup = require('./lib/firedup');

var db;
var dbPath = path.join(__dirname, 'data', 'test');

function initDb(cb) {
  db = levelup(dbPath, { keyEncoding: 'bytewise', valueEncoding: 'json' },
    function (err) {
      db = firedup(db);
      db = sublevel(db);
      cb();
    });
}

var routes = urlrouter(function (app) {
  app.get('/db/*', function (req, res) {
    var match = req.url.match(/^\/db\/(.*)$/);
    var dbUrl = match[1];
    db.urlGet(dbUrl, function (err, data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
    });
  });

  app.put('/db/*', function (req, res) {
    var match = req.url.match(/^\/db\/(.*)$/);
    var dbUrl = match[1];
    var obj;
    try {
      obj = JSON.parse(req.rawBody);
      db.urlPut(dbUrl, obj, function (err, data) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(obj));
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ msg: err.message }));
    }
  });

  app.post('/db/*', function (req, res) {
    var match = req.url.match(/^\/db\/(.*)$/);
    var dbUrl = match[1];
    var obj;
    try {
      obj = JSON.parse(req.rawBody);
      var name = db.urlPush(dbUrl, obj, function (err, data) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ name: name }));
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ msg: err.message }));
    }
  });

  app.delete('/db/*', function (req, res) {
    var match = req.url.match(/^\/db\/(.*)$/);
    var dbUrl = match[1];
    db.urlDel(dbUrl, function (err, data) {
      res.writeHead(204, { 'Content-Type': 'application/json' });
      res.end();
    });
  });
});

function rawBodyParser(req, res, next) {
  if (req.method === 'GET') {
    return next();
  }

  var rawBody = '';
  req.setEncoding('utf8');

  req.on('data', function (data) {
    rawBody += data;
  });

  req.on('end', function () {
    req.rawBody = rawBody;
    next();
  });
}

var app = connect()
  .use(connect.logger('dev'))
  .use(connect.query())
  .use(rawBodyParser)
  .use(routes)
  .use(connect.static(__dirname + '/public'));

function startServer() {
  var port = parseInt(process.argv[2]) || 3000;
  app.listen(port);
  console.log('Listening on port ' + port);
}

initDb(startServer);
