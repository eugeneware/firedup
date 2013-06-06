var jsonpretty = require('../lib/jsonpretty')
  , urlrouter = require('urlrouter');

module.exports = firedupServer;
function firedupServer(db, dbPrefix) {
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }

  var pathRegExp = new RegExp('^' + escapeRegExp(dbPrefix) + '/([^\?$]*)');

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

  var routes = urlrouter(function (app) {
    app.get(dbPrefix + '/*', function (req, res) {
      var match = req.url.match(pathRegExp);
      var dbUrl = match[1];
      db.urlGet(dbUrl, function (err, data) {
        if (req.query && req.query.callback) {
          res.setHeader('Content-Type', 'text/javascript');
          res.end(req.query.callback + '(' + JSON.stringify(data) + ');');
        } else {
          res.setHeader('Content-Type', 'application/json');
          if (req.query && req.query.print === 'pretty') {
            res.end(jsonpretty(data));
          } else {
            res.end(JSON.stringify(data));
          }
        }
      });
    });

    app.put(dbPrefix + '/*', rawBodyParser, function (req, res) {
      var match = req.url.match(pathRegExp);
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

    app.post(dbPrefix + '/*', rawBodyParser, function (req, res) {
      var match = req.url.match(pathRegExp);
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

    app.delete(dbPrefix + '/*', function (req, res) {
      var match = req.url.match(pathRegExp);
      var dbUrl = match[1];
      db.urlDel(dbUrl, function (err, data) {
        res.writeHead(204, { 'Content-Type': 'application/json' });
        res.end();
      });
    });
  });

  return routes;
}
