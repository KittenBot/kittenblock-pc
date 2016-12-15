/**
 * Created by Riven on 2016/12/15.
 */

var util = require("./Utils");

var PluginManager = function(){
    this.pluginlist = [];
    this.pluginpath;
    this.enabledPlugin = null;
};

module.exports = PluginManager;

PluginManager.prototype.enumPlugins = function(pluginpath){
    this.pluginpath = pluginpath;
    var plugin = fs.readdirSync(pluginpath);
    console.log("plugin: " + plugin);
    this.pluginlist = [];
    plugin.forEach(function (p) {
        if(fs.lstatSync(pluginpath+p).isDirectory()) {
            this.pluginlist.push(p);
        }
    });
    return this.pluginlist;
};

PluginManager.prototype.loadPlugins = function(pluginjs){
    var plugin = require(pluginjs);
    this.enabledPlugin = new plugin();
};



