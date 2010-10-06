;Blobastorus = (function() {
    // an inline, private, minified version of jschannel: http://github.com/mozilla/jschannel
    // (close your eyes)
    var Channel=(function(){var s_curTranId=Math.floor(Math.random()*1000001);var s_boundChans={};function s_addBoundChan(origin,scope,handler){var exists=false;if(origin==='*'){for(var k in s_boundChans){if(!s_boundChans.hasOwnProperty(k))continue;if(k==='*')continue;if(typeof s_boundChans[k][scope]==='object'){exists=true;}}}else{if((s_boundChans['*']&&s_boundChans['*'][scope])||(s_boundChans[origin]&&s_boundChans[origin][scope]))
{exists=true;}}
if(exists)throw"A channel already exists which overlaps with origin '"+origin+"' and has scope '"+scope+"'";if(typeof s_boundChans[origin]!='object')s_boundChans[origin]={};s_boundChans[origin][scope]=handler;}
function s_removeBoundChan(origin,scope){delete s_boundChans[origin][scope];}
var s_transIds={};var s_onMessage=function(e){var m=JSON.parse(e.data);if(typeof m!=='object')return;var o=e.origin;var s=null;var i=null;var meth=null;if(typeof m.method==='string'){var ar=m.method.split('::');if(ar.length==2){s=ar[0];meth=ar[1];}else{meth=m.method;}}
if(typeof m.id!=='undefined')i=m.id;if(typeof meth==='string'){if(s_boundChans[o]&&s_boundChans[o][s]){s_boundChans[o][s](o,meth,m);}else if(s_boundChans['*']&&s_boundChans['*'][s]){s_boundChans['*'][s](o,meth,m);}}
else if(typeof i!='undefined'){if(s_transIds[i])s_transIds[i](o,meth,m);}};if(window.addEventListener)window.addEventListener('message',s_onMessage,false);else if(window.attachEvent)window.attachEvent('onmessage',s_onMessage);return{build:function(cfg){var debug=function(m){if(cfg.debugOutput&&window.console&&window.console.log){try{if(typeof m!=='string')m=JSON.stringify(m);}catch(e){}
console.log("["+chanId+"] "+m);}}
if(!window.postMessage)throw("jschannel cannot run this browser, no postMessage");if(!window.JSON||!window.JSON.stringify||!window.JSON.parse){throw("jschannel cannot run this browser, no JSON parsing/serialization");}
if(typeof cfg!='object')throw("Channel build invoked without a proper object argument");if(!cfg.window||!cfg.window.postMessage)throw("Channel.build() called without a valid window argument");if(window===cfg.window)throw("target window is same as present window -- not allowed");var validOrigin=false;if(typeof cfg.origin==='string'){var oMatch;if(cfg.origin==="*")validOrigin=true;else if(null!==(oMatch=cfg.origin.match(/^https?:\/\/(?:[-a-zA-Z0-9\.])+(?::\d+)?/))){cfg.origin=oMatch[0];validOrigin=true;}}
if(!validOrigin)throw("Channel.build() called with an invalid origin");if(typeof cfg.scope!=='undefined'){if(typeof cfg.scope!=='string')throw'scope, when specified, must be a string';if(cfg.scope.split('::').length>1)throw"scope may not contain double colons: '::'"}
var chanId=(function(){var text="";var alpha="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";for(var i=0;i<5;i++)text+=alpha.charAt(Math.floor(Math.random()*alpha.length));return text;})();var regTbl={};var outTbl={};var inTbl={};var ready=false;var pendingQueue=[];var createTransaction=function(id,origin,callbacks){var shouldDelayReturn=false;var completed=false;return{origin:origin,invoke:function(cbName,v){if(!inTbl[id])throw"attempting to invoke a callback of a non-existant transaction: "+id;var valid=false;for(var i=0;i<callbacks.length;i++)if(cbName===callbacks[i]){valid=true;break;}
if(!valid)throw"request supports no such callback '"+cbName+"'";postMessage({id:id,callback:cbName,params:v});},error:function(error,message){completed=true;if(!inTbl[id])throw"error called for non-existant message: "+id;delete inTbl[id];postMessage({id:id,error:error,message:message});},complete:function(v){completed=true;if(!inTbl[id])throw"complete called for non-existant message: "+id;delete inTbl[id];postMessage({id:id,result:v});},delayReturn:function(delay){if(typeof delay==='boolean'){shouldDelayReturn=(delay===true);}
return shouldDelayReturn;},completed:function(){return completed;}};}
var onMessage=function(origin,method,m){if(typeof cfg.gotMessageObserver==='function'){try{cfg.gotMessageObserver(origin,m);}catch(e){debug("gotMessageObserver() raised an exception: "+e.toString());}}
if(m.id&&method){if(regTbl[method]){var trans=createTransaction(m.id,origin,m.callbacks?m.callbacks:[]);inTbl[m.id]={};try{if(m.callbacks&&m.callbacks instanceof Array&&m.callbacks.length>0){for(var i=0;i<m.callbacks.length;i++){var path=m.callbacks[i];var obj=m.params;var pathItems=path.split('/');for(var j=0;j<pathItems.length-1;j++){var cp=pathItems[j];if(typeof obj[cp]!=='object')obj[cp]={};obj=obj[cp];}
obj[pathItems[pathItems.length-1]]=(function(){var cbName=path;return function(params){return trans.invoke(cbName,params);}})();}}
var resp=regTbl[method](trans,m.params);if(!trans.delayReturn()&&!trans.completed())trans.complete(resp);}catch(e){var error="runtime_error";var message=null;if(typeof e==='string'){message=e;}else if(typeof e==='object'){if(e&&e instanceof Array&&e.length==2){error=e[0];message=e[1];}
else if(typeof e.error==='string'){error=e.error;if(!e.message)message="";else if(typeof e.message==='string')message=e.message;else e=e.message;}}
if(message===null){try{message=JSON.stringify(e);}catch(e2){message=e.toString();}}
trans.error(error,message);}}}else if(m.id&&m.callback){if(!outTbl[m.id]||!outTbl[m.id].callbacks||!outTbl[m.id].callbacks[m.callback])
{debug("ignoring invalid callback, id:"+m.id+" ("+m.callback+")");}else{outTbl[m.id].callbacks[m.callback](m.params);}}else if(m.id&&((typeof m.result!=='undefined')||m.error)){if(!outTbl[m.id]){debug("ignoring invalid response: "+m.id);}else{if(m.error){outTbl[m.id].error(m.error,m.message);}else{outTbl[m.id].success(m.result);}
delete outTbl[m.id];delete s_transIds[m.id];}}else if(method){if(regTbl[method]){regTbl[method](null,m.params);}}}
s_addBoundChan(cfg.origin,((typeof cfg.scope==='string')?cfg.scope:''),onMessage);var scopeMethod=function(m){if(typeof cfg.scope==='string'&&cfg.scope.length)m=[cfg.scope,m].join("::");return m;}
var postMessage=function(msg,force){if(!msg)throw"postMessage called with null message";var verb=(ready?"post  ":"queue ");debug(verb+" message: "+JSON.stringify(msg));if(!force&&!ready){pendingQueue.push(msg);}else{if(typeof cfg.postMessageObserver==='function'){try{cfg.postMessageObserver(cfg.origin,msg);}catch(e){debug("postMessageObserver() raised an exception: "+e.toString());}}
cfg.window.postMessage(JSON.stringify(msg),cfg.origin);}}
var onReady=function(trans,type){debug('ready msg received');if(ready)throw"received ready message while in ready state.  help!";if(type==='ping'){chanId+='-R';}else{chanId+='-L';}
obj.unbind('__ready');ready=true;debug('ready msg accepted.');if(type==='ping'){obj.notify({method:'__ready',params:'pong'});}
while(pendingQueue.length){postMessage(pendingQueue.pop());}
if(typeof cfg.onReady==='function')cfg.onReady(obj);};var obj={unbind:function(method){if(regTbl[method]){if(!(delete regTbl[method]))throw("can't delete method: "+method);return true;}
return false;},bind:function(method,cb){if(!method||typeof method!=='string')throw"'method' argument to bind must be string";if(!cb||typeof cb!=='function')throw"callback missing from bind params";if(regTbl[method])throw"method '"+method+"' is already bound!";regTbl[method]=cb;},call:function(m){if(!m)throw'missing arguments to call function';if(!m.method||typeof m.method!=='string')throw"'method' argument to call must be string";if(!m.success||typeof m.success!=='function')throw"'success' callback missing from call";var callbacks={};var callbackNames=[];var pruneFunctions=function(path,obj){if(typeof obj==='object'){for(var k in obj){if(!obj.hasOwnProperty(k))continue;var np=path+(path.length?'/':'')+k;if(typeof obj[k]==='function'){callbacks[np]=obj[k];callbackNames.push(np);delete obj[k];}else if(typeof obj[k]==='object'){pruneFunctions(np,obj[k]);}}}};pruneFunctions("",m.params);var msg={id:s_curTranId,method:scopeMethod(m.method),params:m.params};if(callbackNames.length)msg.callbacks=callbackNames;outTbl[s_curTranId]={callbacks:callbacks,error:m.error,success:m.success};s_transIds[s_curTranId]=onMessage;s_curTranId++;postMessage(msg);},notify:function(m){if(!m)throw'missing arguments to notify function';if(!m.method||typeof m.method!=='string')throw"'method' argument to notify must be string";postMessage({method:scopeMethod(m.method),params:m.params});},destroy:function(){s_removeBoundChan(cfg.origin,((typeof cfg.scope==='string')?cfg.scope:''));if(window.removeEventListener)window.removeEventListener('message',onMessage,false);else if(window.detachEvent)window.detachEvent('onmessage',onMessage);ready=false;regTbl={};inTbl={};outTbl={};cfg.origin=null;pendingQueue=[];debug("channel destroyed");chanId="";}};obj.bind('__ready',onReady);setTimeout(function(){postMessage({method:scopeMethod('__ready'),params:"ping"},true);},0);return obj;}};})();	

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
            console.log("getUser called");
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
        redirectUser: function(args) {
            var url = 'https://blobastor.us/auth/?kickback='; 
            url += ((args && args.return_to === 'string') ? args.return_to : document.location.href);
            document.location = url;
        },
        // And return a reference to the local copy of our channel.  This trick
        // allows the same javascript file to be used on either side of the channel,
        // allowing browser caching to keep identical code from getting delivered
        // twice.
        chan: Channel
    };
})();
