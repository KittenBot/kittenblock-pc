/**
 * Created by Riven on 2017/1/9.
 */

var dgram = require('dgram');


var NetworkConnection = function(){
    /* const for download protocol */
    this.ARDUINO_PAGE_SIZE = 128;

    this.STK_OK = 0x10;
    this.STK_FAILED = 0x11;  //Notused
    this.STK_UNKNOWN = 0x12;  //Notused
    this.STK_NODEVICE = 0x13;  //Notused
    this.STK_INSYNC = 0x14;  //''
    this.STK_NOSYNC = 0x15;  //Notused
    this.ADC_CHANNEL_ERROR = 0x16;  //Notused
    this.ADC_MEASURE_OK = 0x17;  //Notused
    this.PWM_CHANNEL_ERROR = 0x18;  //Notused
    this.PWM_ADJUST_OK = 0x19;  //Notused
    this.CRC_EOP = 0x20;  //'SPACE'
    this.STK_GET_SYNC = 0x30;  //'0'
    this.STK_GET_SIGN_ON = 0x31;  //'1'

    this.STK_SET_PARAMETER = 0x40;  //'@'

    this.STK_GET_PARAMETER = 0x41;  //'A'

    this.STK_SET_DEVICE = 0x42;  //'B'
    this.STK_SET_DEVICE_EXT = 0x45;  //'E'
    this.STK_ENTER_PROGMODE = 0x50;  //'P'
    this.STK_LEAVE_PROGMODE = 0x51;  //'Q'
    this.STK_CHIP_ERASE = 0x52;  //'R'
    this.STK_CHECK_AUTOINC = 0x53;  //'S'
    this.STK_LOAD_ADDRESS = 0x55;  //'U'
    this.STK_UNIVERSAL = 0x56;  //'V'
    this.STK_PROG_FLASH = 0x60;  //'`'
    this.STK_PROG_DATA = 0x61;  //'a'
    this.STK_PROG_FUSE = 0x62;  //'b'
    this.STK_PROG_LOCK = 0x63;  //'c'
    this.STK_PROG_PAGE = 0x64;  //'d'
    this.STK_PROG_FUSE_EXT = 0x65;  //'e'
    this.STK_READ_FLASH = 0x70;  //'p'
    this.STK_READ_DATA = 0x71;  //'q'
    this.STK_READ_FUSE = 0x72;  //'r'
    this.STK_READ_LOCK = 0x73;  //'s'
    this.STK_READ_PAGE = 0x74;  //'t'
    this.STK_READ_SIGN = 0x75;  //'u'
    this.STK_READ_OSCCAL = 0x76;  //'v'
    this.STK_READ_FUSE_EXT = 0x77;  //'w'
    this.STK_READ_OSCCAL_EXT = 0x78;  //'x'

    this.CAT_SETADDR = 0x41;  //'A'
    this.CAT_WRITE = 0x42;  //'B'
    this.CAT_QUIT = 0x45;  //'E'

    this.QUERY_HW_VER = 0x80;
    this.QUERY_SW_MAJOR = 0x81;
    this.QUERY_SW_MINOR = 0x82;

    this.DOWNLOAD_SENDADDR = 0xE0;
    this.DOWNLOAD_SENDCODE = 0xE1;

    this.sock = null;
    this.ping = null;
    this.stkMode = null;
    this.disonnCallback = null;
    this.lastStkCode;
    this.progaddr = 0;
    this.hexLineIndex = 0;
    this.remoteIp = "";
    this.remotePort = "";
    this.robotlist = {};
    this.onReadLine = new chrome.Event();
    this.onError = new chrome.Event();
    // init broad cast udp
    var client = dgram.createSocket("udp4");
    this.ping = client;
    client.bind(function(){
        client.setBroadcast(true);
    });
    client.on('error', function(err){
        console.log("esp sock error "+ err.stack);
    });
    client.on('message',function(msg,rinfo){
        this.robotlist[msg] = rinfo.address;
    }.bind(this));
};

function parseHexLine(hexline){
    if(hexline[0]!=':') return null;
    var len = parseInt(hexline.substring(1, 3), 16);
    var addr = parseInt(hexline.substring(3, 7), 16);
    var typ = parseInt(hexline.substring(7, 9), 16);
    var data = hexline.substring(9, 9+len*2);
    for (var bytes = [], c = 0; c < data.length; c += 2)
        bytes.push(parseInt(data.substr(c, 2), 16));
    var chk = hexline.substring(9+len*2, 9+len*2+2);
    return {len:len,addr:addr,typ:typ,data:bytes,chk:chk};
}

NetworkConnection.prototype.initSocket = function(callback,readlineCb){
    this.stkMode = null;
    this.sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    this.readLineCallback = readlineCb;
    this.sock.on('message',function(msg,rinfo){
        if(this.stkMode){
            this.parseStkCmd(msg);
        }else{
            var lines = msg.toString().match(/[^\r\n]+/g);
            for(var i=0;i<lines.length;i++){
                this.onReadLine.dispatch(lines[i]);
                if(this.readLineCallback) this.readLineCallback(lines[i]);
            }
        }
    }.bind(this));
    this.sock.on('error', function(err){
        console.log("esp sock error "+ err.stack);
        this.onError.dispatch(err.stack);
//        this.sock.close();
    }.bind(this));
    this.sock.on("listening", function(){
        if(callback){
            callback();
        }
    }.bind(this));
    this.sock.bind();
};



NetworkConnection.prototype.parseStkCmd = function(buff){
    //console.log("IN: " + buff.toString('hex')+" "+buff.length);
    if(this.stkMode=="probe" && buff[0]==STK_INSYNC && buff[1]==STK_OK){
        this.stkQuery(QUERY_HW_VER);
    }else if(this.stkMode=="query" && buff[0]==STK_INSYNC){
        if(this.lastStkCode==QUERY_HW_VER){
            this.stkQuery(QUERY_SW_MAJOR);
            console.log("HW version:"+buff[1]);
        }else if(this.lastStkCode==QUERY_SW_MAJOR){
            this.stkQuery(QUERY_SW_MINOR);
            console.log("SW major:"+buff[1]);
        }else if(this.lastStkCode==QUERY_SW_MINOR){
            console.log("SW minor:"+buff[1]);
            // start program
            this.progaddr = 0;
            this.hexLineIndex = 0;
            this.stkAddr();
        }
    }else if(this.stkMode=="download" && buff[0]==STK_INSYNC){
        //console.log("download "+this.lastStkCode);
        if(this.lastStkCode==STK_LOAD_ADDRESS){
            this.stkProgpage();
        }else if(STK_PROG_PAGE){
            if(this.hexLineIndex>=this.hexlines.length){
                this.stkMode = null;
            }else{
                this.stkAddr();
            }
        }
    }else{
        this.stkMode = null;
    }
};

NetworkConnection.prototype.stkAddr = function(){
    var addr = this.progaddr/2;
    var addrl = addr & 0xff;
    var addrh = (addr>>8) & 0xff;
    var testBuff = new Buffer([STK_LOAD_ADDRESS,addrl,addrh,CRC_EOP]);
    this.sock.send(testBuff, 0, 4, this.remotePort, this.remoteIp, function (err) {
        if (err != null)
            console.log("[ERR] espsend error: " + err);
    });
    this.stkMode = "download";
    this.lastStkCode = STK_LOAD_ADDRESS;
};

NetworkConnection.prototype.stkProgpage = function(){
    var pagelen = 0;
    // 1. prepare page buffer
    var progbuff = new Buffer([]);
    while(pagelen<ARDUINO_PAGE_SIZE){
        var obj = parseHexLine(this.hexlines[this.hexLineIndex]);
        this.hexLineIndex+=1;
        if(obj.typ!=0){
            console.log("op:"+obj.typ+" "+obj.addr);
        }
        if(obj.typ==1) break; // EOF
        pagelen+=obj.len;
        progbuff = Buffer.concat([progbuff,new Buffer(obj.data)]);
    }
    this.progaddr+=pagelen;
    var progress = (this.hexLineIndex/this.hexlines.length*100).toFixed(2);
    appendLog("OTA:"+progress+"%","MediumPurple");
    // 2. upload to avr
    var lenl = pagelen & 0xff;
    var lenh = (pagelen>>8) & 0xff;
    var testBuff = new Buffer([STK_PROG_PAGE,lenh,lenl,0x46]);
    var endofbuff = new Buffer([CRC_EOP]);
    var sendBuff = Buffer.concat([testBuff,progbuff,endofbuff]);

    this.sock.send(sendBuff, 0, sendBuff.length, this.remotePort, this.remoteIp, function (err) {
        if (err != null)
            console.log("[ERR] espsend error: " + err);
    });

    this.stkMode = "download";
    this.lastStkCode = STK_PROG_PAGE;
};


NetworkConnection.prototype.stkQuery = function(qtype){
    var testBuff = new Buffer([STK_GET_PARAMETER, qtype, CRC_EOP]);
    this.sock.send(testBuff, 0, 3, this.remotePort, this.remoteIp, function (err) {
        if (err != null)
            console.log("[ERR] espsend error: " + err);
    });
    this.stkMode = "query";
    this.lastStkCode = qtype;
};

NetworkConnection.prototype.loadHex = function(hexfile){
    if(!hexfile){
        hexfile = "arduino/kb_firmware.cpp.hex";
    }
    var s = fs.readFileSync(hexfile, 'utf8');
    this.hexlines = s.match(/[^\r\n]+/g);
};

NetworkConnection.prototype.stkStart = function(){
    this.stkMode = "probe";
    if(!this.sock) return;
    var message = "RESET";
    this.ping.send(message, 0, message.length, 333, this.remoteIp, function (err) {
        if(err!=null)
            console.log("[ERR] espsend error: "+err);
    });
    setTimeout(function() {
        var testBuff = new Buffer([STK_GET_SYNC, CRC_EOP]);
        this.sock.send(testBuff, 0, 2, this.remotePort, this.remoteIp, function (err) {
            if (err != null)
                console.log("[ERR] espsend error: " + err);
        });
    },200);
};

NetworkConnection.prototype.pingRobot = function(){
    var message = "hello";
    this.ping.send(message, 0, message.length, 333, "255.255.255.255", function (err) {
        if(err!=null)
            console.log("[ERR] espsend error: "+err);
    });
};


NetworkConnection.prototype.promoteIpDialog = function(callback,robotip,readlineCb,closeCb){
    if(!robotip){
        robotip = "192.168.4.1:1025";
    }else{
        robotip = robotip+":1025";
    }
    var ip_port = prompt("Please input server ip and port", robotip);
    if (ip_port != null) {
        var tmp = ip_port.split(":");
        this.remoteIp = tmp[0];
        this.remotePort = parseInt(tmp[1]);
        this.disonnCallback = closeCb;
        this.initSocket(function () {
            if(callback){
                callback(ip_port);
            }
        },readlineCb);
    }

};


NetworkConnection.prototype.sendCmd = function(msg){
    this.sock.send(msg, 0, msg.length, this.remotePort, this.remoteIp, function (err) {
        if(err!=null)
            console.log("[ERR] espsend error: "+err);
    });
};

NetworkConnection.prototype.disconnect = function(){
    this.sock.close();
    if(this.disonnCallback){
        this.disonnCallback();
    }
};


module.exports = NetworkConnection;





