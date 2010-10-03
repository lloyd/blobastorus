// load our own little database abstraction
var db = require('./db.js');

// load our twitter authentication abstraction
var twitauth = require('./twitauth.js');

// create an application
var express = require('express');
var app = require('express').createServer();

// serve all files in ../src statically
app.configure(function() {
    app.use(express.staticProvider("../src"));
    app.use(express.bodyDecoder());
});

// API to get a blob
app.get(/^\/api\/get\/([-0-9a-zA-Z.:]+)\/([^\/]+)$/, function(req, res){
    // get the blob associated with the domain (req.params[0]) and
    // (user req.params[2]) requested.
    db.get(req.params[0], req.params[1], function(e,doc) {
        res.send((doc && doc.data) ? JSON.stringify(doc.data) : 404);
    });
});

// API to set a blob
// XXX: the request of this call includes a secret which must be
// protected from eavsedropping!  Add HTTPS here.
// XXX: oh yeah, alternatively the client could sign their request
// with the secret and we could reduce the amount of HTTPSery going on.
app.post(/^\/api\/set\/([-0-9a-zA-Z.:]+)\/([^\/]+)$/, function(req, res){
    // req.params[0] is domain
    // req.params[1] is twitter username
    // body contains:
    //   data: json stringified blob to store
    var data = null;
    try {
        data = JSON.parse(req.body.data);
    } catch(e) {
        // parse error! bad inputs!
        res.send(400);
        return;
    }

    // domain is a collection name, open the collection
    db.set(req.params[0], req.params[1], data, function() {
        res.send(200);
    });
});

// API to list users who have stored blobs for a given domain
// XXX: no, this wouldn't really scale.
app.get(/^\/api\/list\/([-0-9a-zA-Z.:]+)$/, function(req, res){
    // list users with blobs stored for given domain (req.params[0])
    db.list(req.params[0], function(users) {
        // XXX: error handling!
        res.send(users);
    });
});

// Begin twitter authentication (application redirects user here)
app.get("/auth/", function (req, res) {
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
// XXX: The response of this call sends a secret down to the user
// which must be protected from eavsedropping! Add HTTPS here.
app.get("/auth/callback", function (req, res) {
    var oauth_token = req.query.oauth_token;
    var oauth_verifier = req.query.oauth_verifier;

    if (!oauth_token && ! oauth_verifier) {
        res.send("I need a token and verifier.  how'd you get here?", 400);
        return;
    }

    twitauth.finishOAuth(oauth_token, oauth_verifier, function(err, uname, secret, kickback) {
        if(err) res.send(err, 503);
        else {
            // XXX: at this point we should:
            // * store the user's twitter username and this random secret under local storage for blobastor.us
            // * send the user back to the application's kickback url.

            // XXX: as a mockup for now it's an http redirect
            res.redirect(kickback);
        }
    });
});

// open a connection to the databse, upon success we'll bind our webserver
db.open(function() {
    app.listen(3000);
});
