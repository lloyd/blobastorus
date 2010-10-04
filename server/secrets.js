exports.save = function(user, secret) {
    console.log("saving secret: " + user + " - " + secret);
};

exports.auth = function(user, secret) {
    console.log("auth user: " + user + " - " + secret);
    return false;
};
