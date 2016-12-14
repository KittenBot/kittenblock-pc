/**
 * Created by Riven on 2016/12/15.
 */

var http = require("http");
var fs = require("fs");
var path = require("path");
var admzip = require("adm-zip");

var UpdateManager = function(){
    this.version = 0.01;
};

var download = function(url, dest, cb, progressCb) {
    var file = fs.createWriteStream(dest);
    var request = http.get(url, function(response) {
        if(progressCb){
            progressCb(0);
        }
        var totallen = parseInt(response.headers['content-length'], 10);
        var count=0;
        response.pipe(file);
        response.on('data',function(chunk){
            count+=chunk.length;
            var percent = (count/totallen*100).toFixed(2);
            if(progressCb){
                progressCb(percent);
            }
        });
        file.on('finish', function() {
            file.close(cb);  // close() is async, call cb after close completes.
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    })
};

UpdateManager.prototype.getServer = function(callback){
    http.get("http://120.76.118.117:1619/version",function(res){
        const statusCode = res.statusCode;
        const contentType = res.headers['content-type'];
        var body = '';
        res.on('data', function(d) {
            body += d;
        });
        res.on('end', function() {
            var obj = JSON.parse(body);
            if(callback){
                callback(obj);
            }
        });


    });
};

UpdateManager.prototype.doUpdate = function(path,extractPath,callback,progressCb){
    download(path,"update.zip",function(err){
        if(err){
            if(callback){
                callback(-1,err);
            }
            return;
        }

        var zip = new admzip("update.zip");
        var zipEntries = zip.getEntries();
        zip.extractAllTo(extractPath,true);
        callback(0);
    },progressCb);
};



module.exports = UpdateManager;

