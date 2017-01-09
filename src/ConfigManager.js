/**
 * Created by Riven on 2016/12/16.
 */
"use strict";

var fs = require('fs');
var path = require('path');

var ConfigManager = function () {
    this.configFile = process.cwd()+"/kittenblock.json";
};

ConfigManager.prototype.load = function () {
    var s = fs.readFileSync(this.configFile, 'utf8');
    return JSON.parse(s);
};

ConfigManager.prototype.generateIndexHtml = function(lang){
    var template = '<!doctype html>\n'+
        '<html>\n'+
        '<head>\n'+
        '<meta charset="utf-8">\n'+
        '<title>KittenBlock</title>\n'+
        '</head>\n'+
        '<body>\n'+
        '<script type="text/javascript" src="language/en.js"></script>\n'+
        '<script type="text/javascript" src="lib.min.js"></script><script type="text/javascript" src="gui.js"></script></body>\n'+
        '</body>\n'+
        '</html>\n';
    template = template.replace("en.js",lang);
    var s = fs.writeFileSync("app/index.html", template);

};

ConfigManager.prototype.save = function (config) {
    this.generateIndexHtml(config.language.file);
    var configstr = JSON.stringify(config);
    var s = fs.writeFileSync(this.configFile, configstr);
};

module.exports = ConfigManager;




