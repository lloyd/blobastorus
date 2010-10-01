var mongo = require('mongodb');

// establish a connection to mongodb
var host = "127.0.0.1",
    port = 27017;
var db = new mongo.Db('blobastorus', new mongo.Server(host, port, {auto_reconnect: true}),{native_parser:true});

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
    // req.params[0] is domain
    var domain = req.params[0];
    // req.params[1] is twitter username

    // domain is a collection name, open the collection
    db.collection(req.params[0], function(err, col) {
        col.find({user:req.params[1]}, {limit:1}, function(err, cur) {
            cur.nextObject(function(e,doc) {
                res.send((doc && doc.data) ? JSON.stringify(doc.data) : 404);
            });
        });
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
    db.collection(req.params[0], function(err, col) {
        col.findAndModify({user:req.params[1]}, [], {'$set':{data:data}}, {upsert:true}, function(err, cur) {
            // XXX: error handling?
            res.send(200);
        });
    });
});

// API to list users who have stored blobs for a given domain
// XXX: no, this wouldn't really scale.
app.get(/^\/api\/list\/([-0-9a-zA-Z.:]+)$/, function(req, res){
    // req.params[0] is domain
    var domain = req.params[0];

    db.collection(domain, function(err, col) {
        col.find({}, {fields:['user']}, function(err, cur) {
            var users = [];
            cur.each(function(e,doc) {
                if (!doc) {
                    res.send(users);
                } else if (doc.user) {
                    users.push(doc.user);
                }
            });
        });
    });
});

// open a connection to the databse, upon success we'll bind our webserver
db.open(function() {
    app.listen(3000);
});
