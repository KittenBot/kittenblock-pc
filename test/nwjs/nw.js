/**
 * Created by riven on 2016/12/16.
 */

function testPort() {
    kb.enumPort(function (devs) {
        console.log(devs);
        kb.connectPort(devs[1],function (dev) {
            console.log("conn "+dev);
        },function (line) {
            console.log("getline "+line);
        },function () {
            console.log("close port");
        })
    });
}

function testUpdater() {
    kb.getUpdate(function (info) {
        console.log("update info "+JSON.stringify(info));
    });
}

const Kittenblock = require("./kittenblock");
var kb = new Kittenblock();
console.log(kb);
console.log(kb.config);





