/**
 * Created by Riven on 2016/12/15.
 */
"use strict";

var EventEmitter = require('events');
var SerialConnection = require('./SerialConnection');
var UpdateManager = require('./UpdaterManager');
var ArduinoManager = require('./ArduinoManager');
var Toolbox = require('./Toolbox');
var ResourceManager = require('./ResourceManager');
var ConfigManager = require('./ConfigManager');

var KittenBlock = function () {
    var instance = this;
    instance.serial = new SerialConnection();
    instance.updater = new UpdateManager();
    instance.arduino = new ArduinoManager();
    instance.toolbox = new Toolbox();
    instance.resourcemng = new ResourceManager();
    instance.config  = new ConfigManager();

    this.portList = {};

    this.config.load();
};

KittenBlock.prototype.connectPort = function (port) {

};

KittenBlock.prototype.enumPort = function (port, callback) {
    this.serial.enumSerial(function (devices) {
        console.log(devices);
    });
};



module.exports = KittenBlock;
