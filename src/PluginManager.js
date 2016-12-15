/**
 * Created by Riven on 2016/12/15.
 */


var PluginManager = function(){
    this.pluginlist = [];
    this.enabledPlugin = null;
};

module.exports = PluginManager;

PluginManager.prototype.enumPlugins = function(){
    var pluginpath = "./plugin/";
    var plugin = fs.readdirSync(pluginpath);
    console.log("plugin: " + plugin);
    plugin.forEach(function (p) {
        if(fs.lstatSync(pluginpath+p).isDirectory()) {
            KBlock.plugin.pluginlist.push(p);
            if (KBlock.plugin.enabledPlugin == p) {
                $("#plugins").append('<label><input class="plugin_checkbox" type="checkbox" plugin="' + p + '" checked>' + p + '</label>');
            } else {
                $("#plugins").append('<label><input class="plugin_checkbox" type="checkbox" plugin="' + p + '">' + p + '</label>');
            }
        }
    });

    $('input.plugin_checkbox').on('change', function() {
        $('input.plugin_checkbox').not(this).prop('checked', false);
        KBlock.plugin.enabledPlugin = $(this).attr("plugin");
        //KBlock.plugin.loadPlugins($(this).attr("plugin"));
        // todo: add toolbox reload schema
    });

};

PluginManager.prototype.loadPlugins = function(pluginname){
    var pluginpath = "../plugin/" + pluginname +"/"+pluginname+".js";
    loadJsFile(pluginpath, function () {
        console.log("plugin " + pluginpath);
        eval("KBlock.plugin." + pluginname + "=" + pluginname);
        KBlock.Toolbox = KBlock.Toolbox.replace("</xml>", KBlock.plugin[pluginname].toolbox + "</xml>");
        KBlock.plugin.enabledPlugin = pluginname;
        var event = new CustomEvent('kbload', {"loaded": KBlock.plugin});
        window.dispatchEvent(event);
    });

};

PluginManager.prototype.appendBoardToUI = function(){
    var p = KBlock.plugin.enabledPlugin;
    $("#boardlist").append('<li class="divider"></li>');
    KBlock.plugin[p].board.forEach(function(b){
        $("#boardlist").append("<li><a href='#' type='"+b.type+"'>" + b.name + "</a></li>");
    });

};




