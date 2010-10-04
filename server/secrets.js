var db = require("./db");

// does a user use more than this many different browsers on different devices?
var MAX_SECRETS = 20;

// time stamps more than 2 weeks old are "bad"
function goodTS(ts) {
    return (((new Date() - new Date(ts)) / 1000.0) < (2 * 7 * 24 * 60 * 60));
}

function pruneSecrets(secrets) {
    // prune bad secrets off the bottom (either expired timestamp OR too many secrets for this client)
    while (secrets.length > MAX_SECRETS || (secrets.length && !goodTS(secrets[secrets.length - 1].ts))) {
        secrets.pop();
    }
    return secrets;
}

function validSecret(secret, secrets) {
    for (var i = 0; i < secrets.length; i++) {
        if (secrets[i].v === secret) return true;
    }
    return false;
}

exports.save = function(user, secret) {
    // get the user's secrets
    db.getUserSecrets(user, function(secrets) {
        if (!secrets) secrets = [];
        // push the new secret on the top
        secrets.unshift({v: secret, ts: (new Date()).toString()});

        db.setUserSecrets(user, pruneSecrets(secrets));
    });
};

exports.auth = function(user, secret, cb) {
    db.getUserSecrets(user, function(secrets) {
        if (!secrets || !secrets.length) cb(false);
        else {
            var before = secrets.length;
            secrets = pruneSecrets(secrets);
            if (before != secrets.length) db.setUserSecrets(user, secrets);
            return cb(validSecret(secret, secrets));
        }
    });
};
