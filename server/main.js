// XXX: we should break out the oauth stuff into a separate .js
// file
var oauth = require('node-oauth');
var creds = require('./creds.js');

// load our own little database abstraction
var db = require('./db.js');

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
// XXX: this must be HTTPS
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

var auth_endpoint = 'https://api.twitter.com/oauth/authenticate?oauth_token=';


var OAuth = require('node-oauth').OAuth;
oa = new OAuth("https://twitter.com/oauth/request_token",
               "https://twitter.com/oauth/access_token",
               creds.key, creds.secret,
               "1.0A", "http://localhost:3000/auth/callback", "HMAC-SHA1");
var sys = require('sys');

// hack global for now!  we need storage for continuity from /auth/ call to
// redirection back to application
g_oauth_token_secret = null;

// twiter authentication related functions
app.get("/auth/", function (req, res) { 
    // the user enters /auth/ when sent by the application wishing to use blobastor.us
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if(error) {
            res.send('(100) Having a little trouble talking to twitter right now.  FAIL WHALE: ' + JSON.stringify(error), 503);
            return;
        }

        // redirect client
        res.redirect(auth_endpoint + oauth_token);

        // XXX: save token secret and redirect url (where to send the user after completion)
        // in some temporal data store!
        g_oauth_token_secret = oauth_token_secret;
    });
});

// twiter authentication related functions
app.get("/auth/callback", function (req, res) { 
    var oauth_token = req.query.oauth_token;
    var oauth_verifier = req.query.oauth_verifier;

    if (!oauth_token && ! oauth_verifier) {
        res.send("I need a token and verifier.  how'd you get here?", 400);
        return;
    }

    oa.getOAuthAccessToken(
        oauth_token, g_oauth_token_secret, oauth_verifier,
        function(error, access_token, access_token_secret, results)
        {
            if (error) {
                res.send('(103) Having a little trouble talking to twitter right now.  FAIL WHALE: ' + JSON.stringify(error), 503);
                return;
            }

            // now we know we have an authenticated user!  let's get their real login name from twitter
            oa.get("http://api.twitter.com/1/account/verify_credentials.json", access_token, access_token_secret, function(error, data) {
                if (error) {
                    res.send('(105) Having a little trouble talking to twitter right now.  FAIL WHALE: ' + JSON.stringify(error), 503);
                    return;
                }
                try { data = JSON.parse(data); } catch(e) {};
                if (!data.screen_name) {
                    res.send('(110) Twitter returned bogus data!  FAIL WHALE!', 503);
                    return;
                }

                // now we're pretty sure we're who we're talking to! 
                var tuser = data.screen_name;

                // XXX: at this point we should (?):
                // * generate a random secret
                // * store in our mongodb instance an association between the user's twitter id and this
                //   new random secret (NOTE: there's going to likely frequently be multiple secrets per user)
                // * store the user's twitter username and this random secret under local storage for blobastor.us
                // * send the user back to the application's kickback url.
                // (remember, this request *must be* https)
                res.send("hi, " + tuser);
            });
        });

});

// open a connection to the databse, upon success we'll bind our webserver
db.open(function() {
    app.listen(3000);
});
