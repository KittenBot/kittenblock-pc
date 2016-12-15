/**
 * Created by Riven on 2016/12/16.
 */

const PluginManager = require("../src/PluginManager");

var plugin = new PluginManager();
var path =  process.cwd()+'/mcookie.js';
plugin.loadPlugins(path);
console.log(plugin.enabledPlugin.name);


