/**
 * Created by Riven on 2016/12/15.
 */

var Updater = require('../src/UpdaterManager');

var up = new Updater();
var path;

up.getServer(function (res) {
    console.log(res);
    path = res.path;
    up.doUpdate(path,'./',function (ret) {
        console.log("update return "+ret);
    },function (progress) {
        console.log("#"+progress+"%");
    });
});



