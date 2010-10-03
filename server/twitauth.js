// an abstraction to hide as many details as possible around using twitter for
// authentication and identity.

var oauth = require('node-oauth');

// creds must be created by the installer, it should export .key and .secret which are
// oauth consumer creds
var creds = require('./creds.js');

var auth_endpoint = 'https://api.twitter.com/oauth/authenticate?oauth_token=';

var OAuth = require('node-oauth').OAuth;
oa = new OAuth("https://twitter.com/oauth/request_token",
               "https://twitter.com/oauth/access_token",
               creds.key, creds.secret,
               "1.0A", "http://localhost:3000/auth/callback", "HMAC-SHA1");

// hack global for now!  we need storage for continuity from /auth/ call to
// redirection back to application
g_oauth_token_secret = null;

exports.startOAuth = function(cb) {
    oa.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
        if (error) {
            cb("Problem acquiring request token from twitter: " + JSON.stringify(error), null);
        } else {
            cb(null, auth_endpoint + oauth_token);

            // XXX: save token secret and redirect url (where to send the user after completion)
            // in some temporal data store!
            g_oauth_token_secret = oauth_token_secret;
        }
    });
};

exports.finishOAuth = function(token, verifier, cb) {
    oa.getOAuthAccessToken(
        token, g_oauth_token_secret, verifier,
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

                // XXX: at this point we should (?):
                // * generate a random secret
                // * store in our mongodb instance an association between the user's twitter id and this
                //   new random secret (NOTE: there's going to likely frequently be multiple secrets per user)

                cb(null, tuser, "XXX: random sekcret");
            });
        });
};

