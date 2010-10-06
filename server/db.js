// this little abstraction maps the data storage requirements of the
// application onto mongodb...  Minimal implementation details of mongo
// should leak outta this file.

var mongo = require('mongodb');
var host = "127.0.0.1", port = 27017;
var db = new mongo.Db('blobastorus', new mongo.Server(host, port, {auto_reconnect: true}),{native_parser:true});

// XXX: what if open fails?
exports.open = function(cb) {
    db.open(function() {
        cb();
    });
};

// XXX: error handling
exports.get = function(domain,scope,user,cb) {
    if (scope === "") scope = "*";
    db.collection(domain, function(err, col) {
        col.find({user:user}, {limit:1}, function(err, cur) {
            cur.nextObject(function(e,doc) {
                console.log("ungh: " + JSON.stringify(doc));
                var rv = null;
                console.log(doc.data[scope]);
                if (doc && doc.data && doc.data[scope]) rv = doc.data[scope];
                cb(e,rv);
            });
        });
    });
};

exports.set = function(domain,scope,user,data,cb) {
    if (scope === "") scope = "*";
    console.log("set, domain: " + domain);
    console.log("set, scope: " + scope);
    console.log("set, user: " + user);
    db.collection(domain, function(err, col) {
        col.find({user:user}, {limit:1}, function(err, cur) {
            cur.nextObject(function(e,doc) {
                if (doc === null) {
                    doc = {
                        user:user,
                        data: { }
                    };
                }
                doc.data[scope] = data;
                col.findAndModify({user:user}, [], doc, {upsert:true}, function(err, cur) {
                    // XXX: error handling?
                    cb();
                });
            });
        });
    });
};

exports.list = function(domain,cb) {
    db.collection(domain, function(err, col) {
        col.find({}, {fields:['user']}, function(err, cur) {
            var users = [];
            cur.each(function(e,doc) {
                if (!doc) {
                    cb(users);
                } else if (doc.user) {
                    users.push(doc.user);
                }
            });
        });
    });
};

exports.getUserSecrets = function(user, cb) {
    db.collection("users", function(err, col) {
        col.find({user:user}, {limit:1}, function(err, cur) {
            cur.nextObject(function(e,doc) {
                cb((doc && doc.secrets) ? doc.secrets : null);
            });
        });
    });
};

exports.setUserSecrets = function(user, secrets, cb) {
    db.collection("users", function(err, col) {
        col.findAndModify({user:user}, [], {'$set':{secrets:secrets}}, {upsert:true}, function(err, cur) {
            // XXX: error handling?
            if (typeof cb === 'function') cb();
        });
    });
};
