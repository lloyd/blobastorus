;Blobastorus = (function() {
    // an inline, private, minified version of jschannel: http://github.com/mozilla/jschannel
    // (close your eyes)
    var Channel=(function(){var b=Math.floor(Math.random()*1000001);var f={};function e(h,j,i){var l=false;if(h==="*"){for(var g in f){if(!f.hasOwnProperty(g)){continue}if(g==="*"){continue}if(typeof f[g][j]==="object"){l=true}}}else{if((f["*"]&&f["*"][j])||(f[h]&&f[h][j])){l=true}}if(l){throw"A channel already exists which overlaps with origin '"+h+"' and has scope '"+j+"'"}if(typeof f[h]!="object"){f[h]={}}f[h][j]=i}function c(g,h){delete f[g][h]}var a={};var d=function(n){var g=JSON.parse(n.data);if(typeof g!=="object"){return}var p=n.origin;var l=null;var k=null;var h=null;if(typeof g.method==="string"){var j=g.method.split("::");if(j.length==2){l=j[0];h=j[1]}else{h=g.method}}if(typeof g.id!=="undefined"){k=g.id}if(typeof h==="string"){if(f[p]&&f[p][l]){f[p][l](p,h,g)}else{if(f["*"]&&f["*"][l]){f["*"][l](p,h,g)}}}else{if(typeof k!="undefined"){if(a[k]){a[k](p,h,g)}}}};if(window.addEventListener){window.addEventListener("message",d,false)}else{if(window.attachEvent){window.attachEvent("onmessage",d)}}return{build:function(p){var h=function(w){if(p.debugOutput&&window.console&&window.console.log){try{if(typeof w!=="string"){w=JSON.stringify(w)}}catch(x){}console.log("["+j+"] "+w)}};if(!window.postMessage){throw ("jschannel cannot run this browser, no postMessage")}if(!window.JSON||!window.JSON.stringify||!window.JSON.parse){throw ("jschannel cannot run this browser, no JSON parsing/serialization")}if(typeof p!="object"){throw ("Channel build invoked without a proper object argument")}if(!p.window||!p.window.postMessage){throw ("Channel.build() called without a valid window argument")}if(window===p.window){throw ("target window is same as present window -- not allowed")}var i=false;if(typeof p.origin==="string"){var k;if(p.origin==="*"){i=true}else{if(null!==(k=p.origin.match(/^https?:\/\/(?:[-a-zA-Z0-9\.])+(?::\d+)?/))){p.origin=k[0];i=true}}}if(!i){throw ("Channel.build() called with an invalid origin")}if(typeof p.scope!=="undefined"){if(typeof p.scope!=="string"){throw"scope, when specified, must be a string"}if(p.scope.split("::").length>1){throw"scope may not contain double colons: '::'"}}var j=(function(){var y="";var x="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";for(var w=0;w<5;w++){y+=x.charAt(Math.floor(Math.random()*x.length))}return y})();var t={};var g={};var q={};var s=false;var v=[];var m=function(A,w,z){var y=false;var x=false;return{origin:w,invoke:function(E,B){if(!q[A]){throw"attempting to invoke a callback of a non-existant transaction: "+A}var D=false;for(var C=0;C<z.length;C++){if(E===z[C]){D=true;break}}if(!D){throw"request supports no such callback '"+E+"'"}r({id:A,callback:E,params:B})},error:function(B,C){x=true;if(!q[A]){throw"error called for non-existant message: "+A}delete q[A];r({id:A,error:B,message:C})},complete:function(B){x=true;if(!q[A]){throw"complete called for non-existant message: "+A}delete q[A];r({id:A,result:B})},delayReturn:function(B){if(typeof B==="boolean"){y=(B===true)}return y},completed:function(){return x}}};var u=function(H,w,y){if(typeof p.gotMessageObserver==="function"){try{p.gotMessageObserver(H,y)}catch(D){h("gotMessageObserver() raised an exception: "+D.toString())}}if(y.id&&w){if(t[w]){var K=m(y.id,H,y.callbacks?y.callbacks:[]);q[y.id]={};try{if(y.callbacks&&y.callbacks instanceof Array&&y.callbacks.length>0){for(var C=0;C<y.callbacks.length;C++){var J=y.callbacks[C];var B=y.params;var x=J.split("/");for(var A=0;A<x.length-1;A++){var G=x[A];if(typeof B[G]!=="object"){B[G]={}}B=B[G]}B[x[x.length-1]]=(function(){var L=J;return function(M){return K.invoke(L,M)}})()}}var z=t[w](K,y.params);if(!K.delayReturn()&&!K.completed()){K.complete(z)}}catch(D){var F="runtime_error";var I=null;if(typeof D==="string"){I=D}else{if(typeof D==="object"){if(D&&D instanceof Array&&D.length==2){F=D[0];I=D[1]}else{if(typeof D.error==="string"){F=D.error;if(!D.message){I=""}else{if(typeof D.message==="string"){I=D.message}else{D=D.message}}}}}}if(I===null){try{I=JSON.stringify(D)}catch(E){I=D.toString()}}K.error(F,I)}}}else{if(y.id&&y.callback){if(!g[y.id]||!g[y.id].callbacks||!g[y.id].callbacks[y.callback]){h("ignoring invalid callback, id:"+y.id+" ("+y.callback+")")}else{g[y.id].callbacks[y.callback](y.params)}}else{if(y.id&&((typeof y.result!=="undefined")||y.error)){if(!g[y.id]){h("ignoring invalid response: "+y.id)}else{if(y.error){g[y.id].error(y.error,y.message)}else{g[y.id].success(y.result)}delete g[y.id];delete a[y.id]}}else{if(w){if(t[w]){t[w](null,y.params)}}}}}};e(p.origin,((typeof p.scope==="string")?p.scope:""),u);var l=function(w){if(typeof p.scope==="string"&&p.scope.length){w=[p.scope,w].join("::")}return w};var r=function(z,w){if(!z){throw"postMessage called with null message"}var y=(s?"post  ":"queue ");h(y+" message: "+JSON.stringify(z));if(!w&&!s){v.push(z)}else{if(typeof p.postMessageObserver==="function"){try{p.postMessageObserver(p.origin,z)}catch(x){h("postMessageObserver() raised an exception: "+x.toString())}}p.window.postMessage(JSON.stringify(z),p.origin)}};var o=function(w,x){h("ready msg received");if(s){throw"received ready message while in ready state.  help!"}if(x==="ping"){j+="-R"}else{j+="-L"}n.unbind("__ready");s=true;h("ready msg accepted.");if(x==="ping"){n.notify({method:"__ready",params:"pong"})}while(v.length){r(v.pop())}if(typeof p.onReady==="function"){p.onReady(n)}};var n={unbind:function(w){if(t[w]){if(!(delete t[w])){throw ("can't delete method: "+w)}return true}return false},bind:function(x,w){if(!x||typeof x!=="string"){throw"'method' argument to bind must be string"}if(!w||typeof w!=="function"){throw"callback missing from bind params"}if(t[x]){throw"method '"+x+"' is already bound!"}t[x]=w},call:function(w){if(!w){throw"missing arguments to call function"}if(!w.method||typeof w.method!=="string"){throw"'method' argument to call must be string"}if(!w.success||typeof w.success!=="function"){throw"'success' callback missing from call"}var z={};var y=[];var x=function(E,D){if(typeof D==="object"){for(var B in D){if(!D.hasOwnProperty(B)){continue}var C=E+(E.length?"/":"")+B;if(typeof D[B]==="function"){z[C]=D[B];y.push(C);delete D[B]}else{if(typeof D[B]==="object"){x(C,D[B])}}}}};x("",w.params);var A={id:b,method:l(w.method),params:w.params};if(y.length){A.callbacks=y}g[b]={callbacks:z,error:w.error,success:w.success};a[b]=u;b++;r(A)},notify:function(w){if(!w){throw"missing arguments to notify function"}if(!w.method||typeof w.method!=="string"){throw"'method' argument to notify must be string"}r({method:l(w.method),params:w.params})},destroy:function(){c(p.origin,((typeof p.scope==="string")?p.scope:""));if(window.removeEventListener){window.removeEventListener("message",u,false)}else{if(window.detachEvent){window.detachEvent("onmessage",u)}}s=false;t={};q={};g={};p.origin=null;v=[];h("channel destroyed");j=""}};n.bind("__ready",o);setTimeout(function(){r({method:l("__ready"),params:"ping"},true)},0);return n}}})();

    var chan = null;

    // a function that creates channel on demand
    function getChan() {
        if (!chan) {
            // First, we'll create an iframe to hold the blobastorus "conduit"
            var doc = window.document;
            this.iframe = doc.createElement("iframe");
            this.iframe.style.position = "absolute";
            this.iframe.style.left = "-999px";
            this.iframe.style.top = "-999px";
            this.iframe.style.display = "none";

            // Append iframe to the dom and load up target conduit inside
            doc.body.appendChild(this.iframe);
            this.iframe.src = "https://blobastor.us/conduit/index.html";

            chan = Channel.build({
                window: this.iframe.contentWindow,
                origin: "https://blobastor.us",
                scope: "blobastorus"
            });
        }
        return chan;
    }

    var scope = ""

    return {
        setScope: function(s) {
            scope = s;
        },
        getUser: function(cb) {
            getChan().call({
                method: "user",
                success: function(v) { cb(v, null); },
                error: function(e, msg) { cb(null, e); }
            });
        },

        getBlob: function(args, cb) {
            if (typeof args === 'function') {
                cb = args;
                args = {};
            }
            if (!args.scope) args.scope = scope;
            getChan().call({
                method: "getBlob",
                params: args,
                success: function(v) { cb(v, null); },
                error: function(e, msg) { cb(null, e); }
            });
        },
        setBlob: function(val,cb) {
            // allow cb to be optional
            if (typeof cb !== 'function') cb = function() {};
            getChan().call({
                method: "setBlob",
                params: {
                    scope: scope,
                    data: val
                },
                success: function() { cb(null); },
                error: function(e) { cb(e); }
            });
        },
        redirectUser: function(return_to) {
            var url = 'https://blobastor.us/auth/?kickback='; 
            url += ((return_to === 'string') ? return_to : document.location.href);
            document.location = url;
        },
        listDomains: function(cb) {
            if (typeof cb !== 'function') throw "function 'callback' argument missing!";
            getChan().call({
                method: "listDomains",
                success: function(v) { cb(v,null); },
                error: function(e) { cb(null,e); }
            });
        },
        listScopes: function(d, cb) {
            if (typeof d === 'function') { cb = d; d = null; }
            getChan().call({
                method: "listScopes",
                params: d,
                success: function(v) { cb(v,null); },
                error: function(e) { cb(null,e); }
            });
        },
        listUsers: function(domain, scope, cb) {
            var p = {
                domain: null,
                scope: scope
            };
            if (typeof domain === 'function') {
                cb = domain;
            } else if (typeof scope === 'function') {
                p.scope = domain;
                cb = scope;
            } else {
                p.domain = domain;
                p.scope = scope;
            }
            if (typeof d === 'function') { cb = d; d = null; }
            getChan().call({
                method: "listUsers",
                params: p,
                success: function(v) { cb(v,null); },
                error: function(e) { cb(null,e); }
            });
        },
        // And return a reference to the local copy of our channel.  This trick
        // allows the same javascript file to be used on either side of the channel,
        // allowing browser caching to keep identical code from getting delivered
        // twice.
        chan: Channel
    };
})();
