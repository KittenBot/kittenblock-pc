/**
 * Created by Riven on 2016/12/15.
 */

/**
 * Created by Riven on 10/7/16.
 */
"use strict";

var fs = require('fs');
var cp = require('child_process');
var ncp = require('./ncp').ncp;

var ArduinoManager = function(){
    this.autotranslate = false;
    this.sendCmdEvent = new chrome.Event();
    this.baudrate = 115200;
    this.editor = null;
    this.arduinopath = "D:\\AAAA";
    this.arduinoboard = "uno";
    this.boardlist = [{"name":"Arduino UNO","type":"uno"},
        {"name":"Arduino NANO","type":"nano:cpu=atmega328"}];
    this.selectedBoard ="Arduino UNO";
    this.lastSerialPort = "COM6";
    this.autotranslate = false;
    this.digitalQuery = {};
    this.analogQuery = {};
    this.appendLog = null;
    this.notify = null;
};

ArduinoManager.prototype.checkArduinoPath = function(callback){
    fs.access(this.arduinopath, fs.F_OK, function(err) {
        if (err) {
            if(callback){
                callback(err);
            }
            throw err;
        }else{
            callback(0);
        }
    });
};

ArduinoManager.prototype.sb2cpp = function(){
    try {
        var code = "";
        code += Blockly.Arduino.workspaceToCode(workspace);
        if(this.editor){
            this.editor.setValue(code,-1);
        }else{
            console.log("arduino code generator:");
            console.log(code);
        }

    } catch(e) {
        this.appendLog(e.message,"#E77471");
    }
};

ArduinoManager.prototype.copyLibrary = function(src,callback){
    var dst = this.arduinopath+"/libraries";
    if(process.platform=="darwin"){
        dst = this.arduinopath+"/Arduino.app/Contents/Java/libraries";
    }
    ncp(src, dst, function (err) {
        if (err) {
            if(callback) callback(err);
            throw err;
        }
        if(callback) callback(0);
    });
};

ArduinoManager.prototype.loadFactoryFirmware = function(inofilepath){
    var code = fs.readFileSync(inofilepath, 'utf8');
    this.editor.setValue(code,-1);
};

ArduinoManager.prototype.openArduinoIde = function(code,path){
    this.checkArduinoPath();
    var arduinoPath = this.arduinopath;
    fs.writeFile(path, code, function(err) {
        if(err) {
            console.log("Save error "+err);
            throw err;
        }else{
            var cmd = "arduino.exe "+path;
            if(process.platform=="darwin"){
                cmd = "Arduino.app/Contents/MacOS/Arduino "+path;
            }
            var spawn = cp.exec(cmd,{
                encoding: 'utf8',
                cwd: arduinoPath
            });
        }
    });
};

ArduinoManager.prototype.parseLine = function(msg){
    var ret = null;
    this.appendLog(msg, "LightSkyBlue");
    if (msg.indexOf("M3") > -1) {
        var tmp = msg.trim().split(" ");
        var pin = tmp[1];
        var val = tmp[2];
        this.digitalQuery[pin] = val;
    }else if (msg.indexOf("M5") > -1) {
        var tmp = msg.trim().split(" ");
        var pin = tmp[1];
        var val = tmp[2];
        this.analogQuery[pin] = val;
    }else if(msg.indexOf("M101") > -1 ){
        window.vm.postIOData('serial', {slot: "M101", report: null});
    }else if(msg.indexOf("M8") > -1){
        ret = msg.trim().split(" ")[1];
        window.vm.postIOData('serial', {slot: "M8", report: ret});
    }else if(msg.indexOf("M110") > -1){
        var tmp = msg.trim().split(" ");
        var pin = tmp[1];
        var val = tmp[2];
        window.vm.postIOData('serial', {slot: "M110 "+pin, report: val});
    }else if(msg.indexOf("M202") > -1){
        ret = msg.trim().split(" ")[1];
        window.vm.postIOData('serial', {slot: "M202", report: ret});
    }
};

ArduinoManager.prototype.queryData = function(data){
    if(data.type == 'D'){
        if(this.digitalQuery[data.pin]){
            return this.digitalQuery[data.pin];
        }else{
            var cmd = "M13 "+data.pin+" 1";
            this.sendCmd(cmd);
            return 0;
        }
    }else if(data.type == 'A'){
        if(this.analogQuery[data.pin]){
            return this.analogQuery[data.pin];
        }else{
            var cmd = "M15 "+data.pin+" 1";
            this.sendCmd(cmd);
            return 0;
        }
    }

};

ArduinoManager.prototype.stopAll = function(){
    this.digitalQuery = {};
    this.analogQuery = {};
    var msg = "M999\n"; // reset arduino board
    this.sendCmdEvent.dispatch(msg);
};

/*
ArduinoInterface.prototype.appendLog = function(msg, color){
    var psconsole = $('#console-log');
    msg = String(msg); // change to string in case of object
    if (!color) {
        color = "green";
    }
    psconsole.append('<span style="color:' + color + '">' + msg + '</span><br/>');
    psconsole.scrollTop(psconsole[0].scrollHeight - psconsole.height())
};
*/

ArduinoManager.prototype.sendCmd = function(msg){
    this.sendCmdEvent.dispatch(msg);
};

function buildUploadCommand(inofile,cmdType,arduinoboard,arduinopath,lastSerialPort){
    if(!cmdType){
        cmdType = "upload";
    }
    var exec = "arduino.exe";
    if(process.platform=="darwin"){
        exec = "Arduino.app/Contents/MacOS/Arduino";
    }
    var builtpath = process.cwd()+"/workspace/build/";
    //var verbose = config.debug==true?"-v":"";

    var verbose = "-v"; // always use verbose to get compile feedback
    var cmd = exec+" "+verbose+" --"+cmdType+" --pref build.path="+builtpath+" --board arduino:avr:"+arduinoboard+" --port "+lastSerialPort+" "+process.cwd()+inofile;
    return cmd;
}

ArduinoManager.prototype.compileCode = function(path,callback,errCallback){
    var errorcode = null;
    var arduinopath = this.arduinopath;
    this.checkArduinoPath();

    var cmd = buildUploadCommand(path,"verify",this.arduinoboard,this.arduinopath,this.lastSerialPort);
    console.log(cmd);

    var spawn = cp.exec(cmd,{
        encoding: 'utf8',
        cwd: arduinopath
    });
    this.appendLog(">>"+cmd,'blue');

    function setHexpath(hexpath) {
        this.hexpath = hexpath;
    }

    spawn.stdout.on('data', function (data) {
        if(data.indexOf("error")>-1){
            errCallback(data,'orange');
            errorcode = data;
        }else if(data.indexOf("cpp.hex")>-1){
            //appendLog(data,'cyan');
            var hexpath = data.toString().trim().split(" ").pop().replace(/\\/g,"/");
            setHexpath(hexpath);
        }else{
            this.appendLog(data,'grey');
        }
    });

    spawn.stdout.on('end', function (code) {
        appendLog("Compile Finished");
        if(callback && !errorcode){
            callback();
        }
    });
    spawn.stderr.on('data', function (data) {
        appendLog(data,'grey');
    });

};

ArduinoManager.prototype.uploadCode = function(path){
    KBlock.arduino.checkArduinoPath();
    if(KBlock.serial.connectionId!=-1){
        KBlock.serial.disconnect();
    }
    var cmd = buildUploadCommand(path); // temporary project folder
    console.log(cmd);

    var spawn = cp.exec(cmd,{
        encoding: 'utf8',
        cwd: KBlock.arduino.arduinopath
    });
    appendLog("Start Download");
    appendLog(">>"+cmd,'blue');


    spawn.stdout.on('data', function (data) {
        appendLog(data,'grey');
    });
    spawn.stdout.on('end', function (code) {
        appendLog("Download Finished");
    });
    spawn.stderr.on('data', function (data) {
        if(data.indexOf("can't open device")>-1){
            wzNotify("can't open device ", "danger");
            appendLog(data,'orange');
        }else if(data.indexOf("error")>-1){
            wzNotify(data, "danger");
            appendLog(data,'orange');
        }else{
            appendLog(data,'grey');
        }

    });
};

ArduinoManager.prototype.uploadProject = function(){
    var code = this.editor.getValue();
    var path = process.cwd()+"/arduino/project/project.ino";
    fs.writeFile(path, code, function(err) {
        if(err) {
            console.log("Save error "+err);
        }else{
            if(KBlock.connected=="ipPort"){
                KBlock.arduino.compileCode("/arduino/project/project.ino",function(){
                    KBlock.udp.loadHex(KBlock.hexpath);
                    KBlock.udp.stkStart();
                });
            }else{
                KBlock.arduino.uploadCode("/arduino/project/project.ino");
            }
        }
    });
};

ArduinoManager.prototype.tick = function(){
    if(this.autotranslate){
        this.sb2cpp();
    }
};



module.exports = ArduinoManager;
