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
exports.get = function(domain,user,cb) {
    db.collection(domain, function(err, col) {
        col.find({user:user}, {limit:1}, function(err, cur) {
            cur.nextObject(function(e,doc) {
                cb(e,doc);
            });
        });
    });
};

exports.set = function(domain,user,data,cb) {
    db.collection(domain, function(err, col) {
        col.findAndModify({user:user}, [], {'$set':{data:data}}, {upsert:true}, function(err, cur) {
            // XXX: error handling?
            cb();
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
