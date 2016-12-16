/**
 * Created by Riven on 2016/12/15.
 */


var fs = require('fs');
var http = require('http');
var url = require('url');
var crypt = require('crypto');

var ResourceServer = function(){
    this._server = null;
};

module.exports = ResourceServer;

ResourceServer.prototype.getSpriteSkin = function(spriteId){
    var targets = window.vm.runtime.targets;
    for(var i=0;i<targets.length;i++){
        var ele = targets[i];
        if(ele.id==spriteId){
            var skin = ele.sprite.costumes[0].skin;
            return skin;
        }
    }
    return "";
};

ResourceServer.prototype.startServer = function(workspacePath){
    this._server = http.createServer(function (req, res) {
        var request = url.parse(req.url, true);
        var action = request.pathname;
        //console.log("server: " + action);

        if (action.indexOf("png") > -1 ) {
            var img = fs.readFileSync(workspacePath + action.substr(1)); // remove slash
            res.writeHead(200, {'Content-Type': 'image/png'});
            res.end(img, 'binary');
        }else if(action.indexOf("svg") > -1){
            var img = fs.readFileSync(workspacePath + action.substr(1)); // remove slash
            res.writeHead(200, {'Content-Type': 'image/svg+xml'});
            res.end(img, 'binary');
        } else {
            res.writeHead(200, {'Content-Type': 'text/plain'});
            res.end('Hello World \n');
        }
    });

    this._server.on("clientError", function (err, socket) {
        console.log("client error " + err);
        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
    });

    this._server.on('listening', function () {
        console.log('resource server is running');
    });

    this._server.listen(9234);

};


