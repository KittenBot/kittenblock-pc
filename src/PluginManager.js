/**
 * Created by Riven on 2016/12/15.
 */
var fs = require("fs");
var path = require("path");
var util = require("./Utils");

var PluginManager = function(pluginfolder,enabled){
    this.pluginfolder = pluginfolder;
    this.pluginlist = [];
    this.pluginmodule = null;
    this.pluginPackage = {};
    this.enabled = enabled;
};

module.exports = PluginManager;

PluginManager.prototype.enumPlugins = function(){
    var folder = this.pluginfolder;
    var manager = this;
    var plugin = fs.readdirSync(folder);
    console.log("plugin: " + plugin);
    this.pluginlist = [];
    plugin.forEach(function (p) {
        var uri = path.resolve(folder,p);
        if(fs.lstatSync(uri).isDirectory()) {
            var pluginobj = {"name":p,"active":manager.enabled==p?true:false};
            manager.pluginlist.push(pluginobj);
        }
    });
    return this.pluginlist;
};

PluginManager.prototype.loadPlugins = function(plugin,vmruntime){
    var uri = path.resolve(this.pluginfolder,plugin,plugin+".js");
    var f = fs.readFileSync(uri,'utf-8');
    this.pluginmodule = eval(f);
    return this.pluginmodule;
};



