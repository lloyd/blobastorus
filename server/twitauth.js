// an abstraction to hide as many details as possible around using twitter for
// authentication and identity.
var oauth = require('node-oauth');
var secrets = require('./secrets.js');

// creds must be created by the installer, it should export .key and .secret which are
// oauth consumer creds
var creds = require('./creds.js');

var auth_endpoint = 'https://api.twitter.com/oauth/authenticate?oauth_token=';

var OAuth = require('node-oauth').OAuth;
oa = new OAuth("https://twitter.com/oauth/request_token",
               "https://twitter.com/oauth/access_token",
               creds.key, creds.secret,
               "1.0A", "https://localhost:3001/auth/callback", "HMAC-SHA1");

// An in-memory lookup for oauth tokens.  
var g_tokens = { };

function goodTS(ts) {
    return (((new Date() - ts) / 1000.0) < 30.0);
}

function pruneMemoryTable() {
    // tokens older than 30s are considered expired.
    // all the user has to do is log into twitter and allow the app.  If they've allowed
    // the app before and they're authenticated, it's zero click!  30s should be enough, but
    // we'll see.
    for (var i in g_tokens) if (!goodTS(g_tokens[i].ts)) delete g_tokens[i];
}

// every N requests, we'll prune the token map
var g_requests = 0;

exports.startOAuth = function(kickback, cb) {
    g_kickback = kickback;
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if (error) {
            cb("Problem acquiring request token from twitter: " + JSON.stringify(error), null);
        } else {
            cb(null, auth_endpoint + oauth_token);

            // save token secret and redirect url (where to send the user after completion)
            // in an in_memory hash.
            g_requests++;

            g_tokens[oauth_token] = {
                secret: oauth_token_secret,
                kickback: kickback,
                ts: new Date()
            };

            // Every 20 requests let's prune the table
            if (!(g_requests % 20)) pruneMemoryTable();
        }
    });
};

exports.finishOAuth = function(token, verifier, cb) {
    // XXX: this is not particularly good.
    function generateSecret() {
        var text = "";
        var alpha = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        for(var i=0; i < 64; i++) text += alpha.charAt(Math.floor(Math.random() * alpha.length));
        return text;
    }

    // let's find our state from when the request token was attained
    var oauth_token_secret = null;
    var kickback = null;

    if (g_tokens[token]) {
        var t = g_tokens[token];
        delete g_tokens[token];
        if (goodTS(t.ts)) {
            kickback = t.kickback;
            oauth_token_secret = t.secret;
        }
    }

    if (typeof kickback !== 'string' || typeof oauth_token_secret !== 'string') {
        cb("Unrecognized authentication token.  Please retry authentication!");
        return;
    }

    oa.getOAuthAccessToken(
        token, oauth_token_secret, verifier,
        function(error, access_token, access_token_secret, results)
        {
            if (error) {
                cb("Error encountered while promoting request token to access token: " + JSON.stringify(error));
                return;
            }

            // now we know we have an authenticated user!  let's get their real login name from twitter
            oa.get("http://api.twitter.com/1/account/verify_credentials.json", access_token, access_token_secret, function(error, data) {
                if (error) {
                    cb("Error encountered while verifying user credentials: " + JSON.stringify(error));
                    return;
                }
                try { data = JSON.parse(data); } catch(e) {};
                if (!data.screen_name) {
                    cb("Error encountered while verifying user credentials (bogus return data): " + JSON.stringify(error));
                    return;
                }

                // now we're pretty sure we're who we're talking to! 
                var tuser = data.screen_name;
                var sekret = generateSecret();

                // store in our db an association between twitter id new secret
                secrets.save(tuser, sekret);
                cb(null, tuser, sekret, g_kickback);
            });
        });
};

