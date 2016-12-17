/**
 * Created by Riven on 2016/12/16.
 */

const PluginManager = require("../src/PluginManager");

var path = process.cwd()+"/plugins";
var p = new PluginManager(path);

p.enumPlugins();
console.log(p.pluginlist)
p.loadPlugins("kittenbot")
console.log(p.enabledPlugin)
console.log(p.enabledPlugin.getToolbox())
console.log(p.enabledPlugin.getPrimitives())
console.log(p.enabledPlugin.getBlocks())

