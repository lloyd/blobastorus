// configuration
var cfg = require('./cfg.js');

// add a path to find node libraries if required 
if (cfg.node_libraries) require.paths.unshift(cfg.node_libraries);

// load our own little database abstraction
var db = require('./db.js');

// load our twitter authentication abstraction
var twitauth = require('./twitauth.js');

// load the secret store, our abstraction around
// auth secret storage and management
var secrets = require('./secrets.js');

// create an application
var express = require('express');
var app = require('express').createServer();
var apps = require('express').createServer();

// serve all files in ../src statically
app.configure(function() {
    app.use(express.staticProvider("../site"));
});

apps.configure(function() {
    apps.use(express.staticProvider("../src"));
    apps.use(express.bodyDecoder());
    apps.set('view options', { layout: false });
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
apps.get(/^\/api\/get\/([-0-9a-zA-Z.:]+)\/([a-zA-Z_]*)\/([^\/]+)$/, function(req, res){
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
apps.post(/^\/api\/set\/([-0-9a-zA-Z.:]+)\/([a-zA-Z_]*)\/([^\/]+)$/, function(req, res){
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
apps.get(/^\/api\/domains$/, function(req, res){
    // list users with blobs stored for given domain (req.params[0])
    db.domains(function(domains) {
        setJSONResponseHeaders(res);
        res.send(domains);
    });
});

// API list data scopes within a domain
apps.get(/^\/api\/scopes\/([-0-9a-zA-Z.:]+)$/, function(req, res){
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
apps.get(/^\/api\/users\/([-0-9a-zA-Z.:]+)\/([a-zA-Z_]*)$/, function(req, res){
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
apps.get("/auth/", function (req, res) {
    var kickback = req.query.kickback;

    if (!kickback) {
        res.send("I need a valid kickback url to continue (?kickback=XXX).", 400);
        return;
    }

    // the user enters /auth/ when sent by the application wishing to use blobastor.us
    twitauth.startOAuth(kickback, function(err, url) {
        if(err) res.send(err, 503);
        else    res.redirect(url);
    });
});

// Complete twitter authentication (twitter redirects user here)
// The response of this call sends a secret down to the user,
// hence, HTTPS.
apps.get("/auth/callback", function (req, res) {
    var oauth_token = req.query.oauth_token;
    var oauth_verifier = req.query.oauth_verifier;

    if (!oauth_token && ! oauth_verifier) {
        res.send("I need a token and verifier.  how'd you get here?", 400);
        return;
    }

    twitauth.finishOAuth(oauth_token, oauth_verifier, function(err, uname, secret, kickback) {
        if(err) res.send(err, 503);
        else {
            // Render a page which will do the following on the client:
            // * store the user's twitter username and this random secret under local storage for blobastor.us
            // * send the user back to the application's kickback url.
            res.render('./setAndRedirect.ejs', {
                locals: {
                    user: uname,
                    secret: secret,
                    kickback: kickback
                }
            });
        }
    });
});

// open a connection to the databse, upon success we'll bind our webserver
db.open(function() {
    app.listen(cfg.port, cfg.ip_to_bind);
    apps.listen(cfg.sslport, cfg.ip_to_bind);
    if (cfg.who) process.setuid(cfg.who);
});
