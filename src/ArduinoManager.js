/**
 * Created by Riven on 2016/12/15.
 */

/**
 * Created by Riven on 10/7/16.
 */

var fs = require('fs');
var cp = require('child_process');
var ncp = require('./src/ncp').ncp;

var ArduinoInterface = function(){
    this.autotranslate = false;
    this.sendCmdEvent = new chrome.Event();
    this.baudrate = 115200;
    this.editor = null;
    this.arduinopath = "D:\\AAAA";
    this.arduinoboard = "uno";
    this.boardlist = [{"name":"Arduino UNO","type":"uno"},
        {"name":"Arduino NANO","type":"nano:cpu=atmega328"}];
    this.selectedBoard ="Arduino UNO" ;
    this.lastSerialPort = "COM6";
    this.autotranslate = false;
    this.digitalQuery = {};
    this.analogQuery = {};
    this.appendLog = null;
    this.notify = null;
};

//module.export = ArduinoInterface;

ArduinoInterface.prototype.checkArduinoPath = function(callback){
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

ArduinoInterface.prototype.sb2cpp = function(){
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

ArduinoInterface.prototype.copyLibrary = function(src,callback){
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

ArduinoInterface.prototype.loadFactoryFirmware = function(){
    var code = fs.readFileSync("./arduino/kb_firmware/kb_firmware.ino", 'utf8');
    this.editor.setValue(code,-1);
};

ArduinoInterface.prototype.openArduinoIde = function(code,path){
    this.checkArduinoPath();
    var arduinoPath = this.arduinopath;
    fs.writeFile(path, code, function(err) {
        if(err) {
            console.log("Save error "+err);
        }else{
            var cmd = "arduino.exe "+path;
            if(process.platform=="darwin"){
                cmd = "Arduino.app/Contents/MacOS/Arduino "+path;
            }
            var spawn = cp.exec(cmd,{
                encoding: 'utf8',
                cwd: arduinoPath
            });
            console.log("openArduinoIde "+spawn);
        }
    });
};

ArduinoInterface.prototype.parseLine = function(msg){
    var ret = null;
    appendLog(msg, "LightSkyBlue");
    if (msg.indexOf("M3") > -1) {
        var tmp = msg.trim().split(" ");
        var pin = tmp[1];
        var val = tmp[2];
        //window.vm.postIOData('serial', {slot: "M3 "+pin, report: val});
        KBlock.arduino.digitalQuery[pin] = val;
    }else if (msg.indexOf("M5") > -1) {
        var tmp = msg.trim().split(" ");
        var pin = tmp[1];
        var val = tmp[2];
        //window.vm.postIOData('serial', {slot: "M5 "+pin, report: val});
        KBlock.arduino.analogQuery[pin] = val;
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

ArduinoInterface.prototype.queryData = function(data){
    if(data.type == 'D'){
        if(KBlock.arduino.digitalQuery[data.pin]){
            return KBlock.arduino.digitalQuery[data.pin];
        }else{
            var cmd = "M13 "+data.pin+" 1";
            KBlock.arduino.sendCmd(cmd);
            return 0;
        }
    }else if(data.type == 'A'){
        if(KBlock.arduino.analogQuery[data.pin]){
            return KBlock.arduino.analogQuery[data.pin];
        }else{
            var cmd = "M15 "+data.pin+" 1";
            KBlock.arduino.sendCmd(cmd);
            return 0;
        }
    }

};

ArduinoInterface.prototype.stopAll = function(){
    this.digitalQuery = {};
    this.analogQuery = {};
    var msg = "M999\n"; // reset arduino board
    this.sendCmdEvent.dispatch(msg);
};

ArduinoInterface.prototype.appendLog = function(msg, color){
    var psconsole = $('#console-log');
    msg = String(msg); // change to string in case of object
    if (!color) {
        color = "green";
    }
    psconsole.append('<span style="color:' + color + '">' + msg + '</span><br/>');
    psconsole.scrollTop(psconsole[0].scrollHeight - psconsole.height())
};

ArduinoInterface.prototype.sendCmd = function(msg){
    this.sendCmdEvent.dispatch(msg);
};

function buildUploadCommand(inofile,cmdType){
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
    var cmd = exec+" "+verbose+" --"+cmdType+" --pref build.path="+builtpath+" --board arduino:avr:"+KBlock.arduino.arduinoboard+" --port "+KBlock.arduino.lastSerialPort+" "+process.cwd()+inofile;
    return cmd;
}

ArduinoInterface.prototype.compileCode = function(path,callback,errCallback){
    var errorcode = null;
    this.checkArduinoPath();

    var cmd = buildUploadCommand(path,"verify"); // temporary project folder
    console.log(cmd);

    var spawn = cp.exec(cmd,{
        encoding: 'utf8',
        cwd: KBlock.arduino.arduinopath
    });
    appendLog(">>"+cmd,'blue');

    spawn.stdout.on('data', function (data) {
        if(data.indexOf("error")>-1){
            errCallback(data,'orange');
            errorcode = data;
        }else if(data.indexOf("cpp.hex")>-1){
            //appendLog(data,'cyan');
            this.hexpath = data.toString().trim().split(" ").pop().replace(/\\/g,"/");
        }else{
            appendLog(data,'grey');
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

ArduinoInterface.prototype.uploadCode = function(path){
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

ArduinoInterface.prototype.uploadProject = function(){
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

ArduinoInterface.prototype.tick = function(){
    if(KBlock.arduino.autotranslate){
        KBlock.arduino.sb2cpp();
    }
};



