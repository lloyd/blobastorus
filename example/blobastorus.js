;Blobastorus = (function() {
    if (!window.localStorage) throw("this page needs localStorage support in your browser");
    var sto = window.localStorage;
    return {
        get: function(cb) {
            setTimeout(function() {
                cb(sto.getItem("key"));
            }, 100);
        },
        set: function(val,cb) {
            setTimeout(function() {
                sto.setItem("key", val);
                cb(true);
            }, 100);
        }
    };
})();
