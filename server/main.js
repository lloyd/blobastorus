#!/usr/bin/env node

// load our own little database abstraction
const
db = require('./db.js'),
secrets = require('./secrets.js'),
path = require('path'),
express = require('express'),
winston = require('winston');

var app = require('express').createServer();

// set up logging
winston.remove(winston.transports.Console);
winston.add(winston.transports.Console, { colorize: true, format: 'dev' });

// true all files in ../src statically
app.configure(function() {
  app.use(express.logger({
    format: 'dev',
    stream: {
      write: function(x) {
        winston.info(typeof x === 'string' ? x.trim() : x);
      }
    }
  }));
  app.use(express.static(path.join(__dirname, "..", "site")));
  app.use(express.static(path.join(__dirname, "..", "src")));
  app.use(express.bodyParser());
});

// validate domains
function validDomain(domain) {
  return (typeof domain === 'string' && domain.length > 0 && domain !== 'users');
}

function setJSONResponseHeaders(res) {
  res.header('Cache-Control', 'no-cache');
  res.contentType("application/json");
}

// API to get a blob
app.get(/^\/api\/get\/([-0-9a-zA-Z.:]+)\/([a-zA-Z_]*)\/([^\/]+)$/, function(req, res){
  var domain = req.params[0];
  var scope = req.params[1];
  var user = req.params[2];

  if (!validDomain(domain)) {
    res.send(400);
    return;
  }

  // get the blob associated with the domain (req.params[0]) and
  // (user req.params[2]) requested.
  db.get(domain, scope, user, function(e,doc) {
    if (doc) {
      setJSONResponseHeaders(res);
      res.send(JSON.stringify(doc));
	  } else {
	    res.send(404);
	  }
  });
});

const POST_LIMIT = (1024 * 20);

// API to set a blob
// XXX: oh yeah, alternatively the client could sign their request
// with the secret and we could reduce the amount of HTTPSery going on.
app.post(/^\/api\/set\/([-0-9a-zA-Z.:]+)\/([a-zA-Z_]*)\/([^\/]+)$/, function(req, res){
  // disallow posts of greater than 20k
  // XXX: should this happen earlier in the processing stack?  just slam connections
  // closed if we read a header or body of more than 20k?
  if (req.body.data && req.body.data.length > POST_LIMIT) {
    res.send("blobastor.us doesn't accepts blobs larger than " + POST_LIMIT + " bytes", 413);
    return;
  }
  // req.params[0] is domain
  // req.params[1] is data scope
  // req.params[2] is twitter username
  // body contains:
  //   data: json stringified blob to store
  var domain = req.params[0];
  var scope = req.params[1];
  var user = req.params[2];
  var data = null;
  var secret = null;

  if (!validDomain(domain)) {
    res.send(400);
    return;
  }

  try {
    data = JSON.parse(req.body.data);
    secret = req.body.secret;
  } catch(e) {
    // parse error! bad inputs!
    res.send(400);
    return;
  }

  // and check the auth creds
  secrets.auth(user, secret, function(ok) {
    if (!ok) {
      res.send(403);
    } else {
      // domain is a collection name, open the collection
      db.set(domain, scope, user, data, function() {
        res.send(200);
      });
    }
  });
});

// API to list domains where data is available
app.get(/^\/api\/domains$/, function(req, res){
  // list users with blobs stored for given domain (req.params[0])
  db.domains(function(domains) {
    setJSONResponseHeaders(res);
    res.send(domains);
  });
});

// API list data scopes within a domain
app.get(/^\/api\/scopes\/([-0-9a-zA-Z.:]+)$/, function(req, res){
  var domain = req.params[0];

  if (!validDomain(domain)) {
    res.send(400);
    return;
  }

  // get the blob associated with the domain (req.params[0]) and
  // (user req.params[2]) requested.
  db.scopes(domain, function(scopes) {
    setJSONResponseHeaders(res);
    res.send(scopes);
  });
});

// API list users who have data stored for a given domain and scope
app.get(/^\/api\/users\/([-0-9a-zA-Z.:]+)\/([a-zA-Z_]*)$/, function(req, res){
  var domain = req.params[0];
  var scope = req.params[1];

  if (!validDomain(domain)) {
    res.send(400);
    return;
  }

  // get the blob associated with the domain (req.params[0]) and
  // (user req.params[2]) requested.
  db.users(domain, scope, function(users) {
    setJSONResponseHeaders(res);
    res.send(users);
  });
});

// Begin twitter authentication (application redirects user here)
app.get("/api/logged_in", function (req, res) {
  res.send("not implemented", 503);
});

app.post("/api/verify", function (req, res) {
  res.send("not implemented", 503);
});


// open a connection to the databse, upon success we'll bind our webserver
db.open(function() {
  app.listen(process.env.PORT || 3000, function() {
    console.log("bound to " + app.address().port);
  });
});
