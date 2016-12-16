/**
 * Created by Riven on 2016/12/16.
 */
"use strict";

var fs = require('fs');

var ConfigManager = function () {
    this.configFile = process.cwd()+"/kittenblock.json";
};

ConfigManager.prototype.load = function () {
    var s = fs.readFileSync(this.configFile, 'utf8');
    return JSON.parse(s);
};

module.exports = ConfigManager;



