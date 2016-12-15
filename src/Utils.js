/**
 * Created by Riven on 2016/12/16.
 */

var Utils = function () {};


Utils.loadJsToHead = function (jspath,callback) {
    var head = dom.getDocumentHead();
    var s = document.createElement('script');

    s.src = jspath;
    head.appendChild(s);

    s.onload = s.onreadystatechange = function(_, isAbort) {
        if (isAbort || !s.readyState || s.readyState == "loaded" || s.readyState == "complete") {
            s = s.onload = s.onreadystatechange = null;
            if (!isAbort)
                callback();
        }
    };
};


module.exports = Utils;
