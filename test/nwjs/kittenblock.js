module.exports =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Created by Riven on 2016/12/15.
	 */
	"use strict";

	var EventEmitter = __webpack_require__(1);
	var SerialConnection = __webpack_require__(2);
	var UpdateManager = __webpack_require__(3);
	var ArduinoManager = __webpack_require__(23);
	var Toolbox = __webpack_require__(26);
	var ResourceManager = __webpack_require__(27);
	var ConfigManager = __webpack_require__(30);

	var KittenBlock = function KittenBlock() {
	    var instance = this;
	    instance.serial = new SerialConnection();
	    instance.updater = new UpdateManager();
	    instance.arduino = new ArduinoManager();
	    instance.toolbox = new Toolbox();
	    instance.resourcemng = new ResourceManager();
	    instance.configmng = new ConfigManager();

	    this.connectedPort = null;
	    this.portList = [];
	    this.config = this.configmng.load();
	};

	KittenBlock.prototype.connectPort = function (port, successCb, readlineCb, closeCb) {
	    var _this = this;
	    if (port.type == 'serial') {
	        var ser = this.serial;
	        ser.connect(port.path, { bitrate: this.config.baudrate }, function (ret) {
	            ser.onReadLine.addListener(readlineCb);
	            ser.onDisconnect.addListener(function () {
	                _this.connectedPort = null;
	                closeCb();
	            });
	            _this.connectedPort = { "path": port.path, "type": "serial" };
	            successCb(port.path);
	        });
	    }
	};

	KittenBlock.prototype.disConnectPort = function (callback) {
	    if (this.connectedPort == null) return;
	    if (this.connectedPort.type == 'serial') {
	        this.serial.disconnect();
	    }
	};

	KittenBlock.prototype.sendCmd = function (data) {
	    if (this.connectedPort && this.connectedPort.type == 'serial') {
	        this.serial.send(data + '\r\n');
	    }
	};

	KittenBlock.prototype.enumPort = function (callback) {
	    var kb = this;
	    kb.portList = [];
	    this.serial.enumSerial(function (devices) {
	        devices.forEach(function (dev) {
	            var port = { "path": dev.path, "type": 'serial' };
	            kb.portList.push(port);
	        });
	        if (callback) callback(kb.portList);
	    });
	};

	KittenBlock.prototype.getUpdate = function (callback) {
	    this.updater.getServer(callback);
	};

	module.exports = KittenBlock;

/***/ },
/* 1 */
/***/ function(module, exports) {

	module.exports = require("events");

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	/**
	 * Created by Riven on 10/7/16.
	 */

	var SerialConnection = function SerialConnection() {
	    this.connectionId = -1;
	    this.lineBuffer = "";
	    this.boundOnReceive = this.onReceive.bind(this);
	    this.boundOnReceiveError = this.onReceiveError.bind(this);
	    this.onReadLine = new chrome.Event();
	    this.onDisconnect = new chrome.Event();
	};

	/* Interprets an ArrayBuffer as UTF-8 encoded string data. */
	var ab2str = function ab2str(buf) {
	    var bufView = new Uint8Array(buf);
	    var encodedString = String.fromCharCode.apply(null, bufView);
	    return decodeURIComponent(escape(encodedString));
	};

	/* Converts a string to UTF-8 encoding in a Uint8Array; returns the array buffer. */
	var str2ab = function str2ab(str) {
	    var encodedString = unescape(encodeURIComponent(str));
	    var bytes = new Uint8Array(encodedString.length);
	    for (var i = 0; i < encodedString.length; ++i) {
	        bytes[i] = encodedString.charCodeAt(i);
	    }
	    return bytes.buffer;
	};

	SerialConnection.prototype.enumSerial = function (callback) {
	    this.getDevices(function (ports) {
	        if (callback) {
	            callback(ports);
	        }
	    });
	};

	SerialConnection.prototype.getDevices = function (callback) {
	    chrome.serial.getDevices(callback);
	};

	SerialConnection.prototype.onReceive = function (receiveInfo) {
	    if (receiveInfo.connectionId !== this.connectionId) {
	        return;
	    }
	    //console.log("buf "+receiveInfo.data.byteLength+">>"+ab2str(receiveInfo.data));
	    this.lineBuffer += ab2str(receiveInfo.data);
	    var index;
	    while ((index = this.lineBuffer.indexOf('\n')) >= 0) {
	        var line = this.lineBuffer.substr(0, index + 1);
	        this.onReadLine.dispatch(line);
	        this.lineBuffer = this.lineBuffer.substr(index + 1);
	    }
	};

	SerialConnection.prototype.onReceiveError = function (errorInfo) {
	    if (errorInfo.connectionId === this.connectionId) {
	        console.log("on receive error " + errorInfo.connectionId);
	        this.onDisconnect.dispatch(errorInfo.connectionId);
	    }
	};

	SerialConnection.prototype.onConnect = function (callback, connectionInfo) {
	    if (!connectionInfo) {
	        console.log("Connection failed.");
	        if (callback) callback(-1);
	        return;
	    }
	    this.connectionId = connectionInfo.connectionId;

	    chrome.serial.onReceive.addListener(this.boundOnReceive);
	    chrome.serial.onReceiveError.addListener(this.boundOnReceiveError);
	    this.lineBuffer = "";
	    if (callback) callback(connectionInfo);
	};

	SerialConnection.prototype.onClosed = function (callback, result) {
	    //console.log("serial disconnect "+result);
	    this.connectionId = -1;
	    this.onDisconnect.dispatch(this.connectionId);
	    // remove listeners
	    chrome.serial.onReceive.removeListener(this.boundOnReceive);
	    chrome.serial.onReceiveError.removeListener(this.boundOnReceiveError);
	    if (callback) callback();
	};

	SerialConnection.prototype.connect = function (path, option, callback) {
	    chrome.serial.connect(path, option, this.onConnect.bind(this, callback));
	};

	SerialConnection.prototype.disconnect = function (callback) {
	    if (this.connectionId == -1) return;
	    chrome.serial.disconnect(this.connectionId, this.onClosed.bind(this, callback));
	};

	SerialConnection.prototype.send = function (msg) {
	    if (this.connectionId == -1) return;
	    console.log("send " + msg);
	    chrome.serial.send(this.connectionId, str2ab(msg), function () {});
	};

	SerialConnection.prototype.sendbuf = function (buffer) {
	    if (this.connectionId == -1) return;
	    console.log("send " + buffer);
	    chrome.serial.send(this.connectionId, buffer, function () {});
	};

	module.exports = SerialConnection;

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	/**
	 * Created by Riven on 2016/12/15.
	 */

	var http = __webpack_require__(4);
	var fs = __webpack_require__(5);
	var path = __webpack_require__(6);
	var admzip = __webpack_require__(7);

	var UpdateManager = function UpdateManager() {
	    this.version = 0.01;
	};

	var download = function download(url, dest, cb, progressCb) {
	    var file = fs.createWriteStream(dest);
	    var request = http.get(url, function (response) {
	        if (progressCb) {
	            progressCb(0);
	        }
	        var totallen = parseInt(response.headers['content-length'], 10);
	        var count = 0;
	        response.pipe(file);
	        response.on('data', function (chunk) {
	            count += chunk.length;
	            var percent = (count / totallen * 100).toFixed(2);
	            if (progressCb) {
	                progressCb(percent);
	            }
	        });
	        file.on('finish', function () {
	            file.close(cb); // close() is async, call cb after close completes.
	        });
	    }).on('error', function (err) {
	        // Handle errors
	        fs.unlink(dest); // Delete the file async. (But we don't check the result)
	        if (cb) cb(err.message);
	    });
	};

	UpdateManager.prototype.getServer = function (callback) {
	    http.get("http://120.76.118.117:1619/version", function (res) {
	        var statusCode = res.statusCode;
	        var contentType = res.headers['content-type'];
	        var body = '';
	        res.on('data', function (d) {
	            body += d;
	        });
	        res.on('end', function () {
	            var obj = JSON.parse(body);
	            if (callback) {
	                callback(obj);
	            }
	        });
	    });
	};

	UpdateManager.prototype.doUpdate = function (path, extractPath, callback, progressCb) {
	    download(path, "update.zip", function (err) {
	        if (err) {
	            if (callback) {
	                callback(-1, err);
	            }
	            return;
	        }

	        var zip = new admzip("update.zip");
	        var zipEntries = zip.getEntries();
	        zip.extractAllTo(extractPath, true);
	        callback(0);
	    }, progressCb);
	};

	module.exports = UpdateManager;

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = require("http");

/***/ },
/* 5 */
/***/ function(module, exports) {

	module.exports = require("fs");

/***/ },
/* 6 */
/***/ function(module, exports) {

	module.exports = require("path");

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(5),
	    pth = __webpack_require__(6);

	fs.existsSync = fs.existsSync || pth.existsSync;

	var ZipEntry = __webpack_require__(8),
	    ZipFile =  __webpack_require__(22),
	    Utils = __webpack_require__(9);

	module.exports = function(/*String*/input) {
	    var _zip = undefined,
	        _filename = "";

	    if (input && typeof input === "string") { // load zip file
	        if (fs.existsSync(input)) {
	            _filename = input;
	            _zip = new ZipFile(input, Utils.Constants.FILE);
	        } else {
	           throw Utils.Errors.INVALID_FILENAME;
	        }
	    } else if(input && Buffer.isBuffer(input)) { // load buffer
	        _zip = new ZipFile(input, Utils.Constants.BUFFER);
	    } else { // create new zip file
	        _zip = new ZipFile(null, Utils.Constants.NONE);
	    }

	    function getEntry(/*Object*/entry) {
	        if (entry && _zip) {
	            var item;
	            // If entry was given as a file name
	            if (typeof entry === "string")
	                item = _zip.getEntry(entry);
	            // if entry was given as a ZipEntry object
	            if (typeof entry === "object" && entry.entryName != undefined && entry.header != undefined)
	                item =  _zip.getEntry(entry.entryName);

	            if (item) {
	                return item;
	            }
	        }
	        return null;
	    }

	    return {
	        /**
	         * Extracts the given entry from the archive and returns the content as a Buffer object
	         * @param entry ZipEntry object or String with the full path of the entry
	         *
	         * @return Buffer or Null in case of error
	         */
	        readFile : function(/*Object*/entry) {
	            var item = getEntry(entry);
	            return item && item.getData() || null;
	        },

	        /**
	         * Asynchronous readFile
	         * @param entry ZipEntry object or String with the full path of the entry
	         * @param callback
	         *
	         * @return Buffer or Null in case of error
	         */
	        readFileAsync : function(/*Object*/entry, /*Function*/callback) {
	            var item = getEntry(entry);
	            if (item) {
	                item.getDataAsync(callback);
	            } else {
	                callback(null,"getEntry failed for:" + entry)
	            }
	        },

	        /**
	         * Extracts the given entry from the archive and returns the content as plain text in the given encoding
	         * @param entry ZipEntry object or String with the full path of the entry
	         * @param encoding Optional. If no encoding is specified utf8 is used
	         *
	         * @return String
	         */
	        readAsText : function(/*Object*/entry, /*String - Optional*/encoding) {
	            var item = getEntry(entry);
	            if (item) {
	                var data = item.getData();
	                if (data && data.length) {
	                    return data.toString(encoding || "utf8");
	                }
	            }
	            return "";
	        },

	        /**
	         * Asynchronous readAsText
	         * @param entry ZipEntry object or String with the full path of the entry
	         * @param callback
	         * @param encoding Optional. If no encoding is specified utf8 is used
	         *
	         * @return String
	         */
	        readAsTextAsync : function(/*Object*/entry, /*Function*/callback, /*String - Optional*/encoding) {
	            var item = getEntry(entry);
	            if (item) {
	                item.getDataAsync(function(data) {
	                    if (data && data.length) {
	                        callback(data.toString(encoding || "utf8"));
	                    } else {
	                        callback("");
	                    }
	                })
	            } else {
	                callback("");
	            }
	        },

	        /**
	         * Remove the entry from the file or the entry and all it's nested directories and files if the given entry is a directory
	         *
	         * @param entry
	         */
	        deleteFile : function(/*Object*/entry) { // @TODO: test deleteFile
	            var item = getEntry(entry);
	            if (item) {
	                _zip.deleteEntry(item.entryName);
	            }
	        },

	        /**
	         * Adds a comment to the zip. The zip must be rewritten after adding the comment.
	         *
	         * @param comment
	         */
	        addZipComment : function(/*String*/comment) { // @TODO: test addZipComment
	            _zip.comment = comment;
	        },

	        /**
	         * Returns the zip comment
	         *
	         * @return String
	         */
	        getZipComment : function() {
	            return _zip.comment || '';
	        },

	        /**
	         * Adds a comment to a specified zipEntry. The zip must be rewritten after adding the comment
	         * The comment cannot exceed 65535 characters in length
	         *
	         * @param entry
	         * @param comment
	         */
	        addZipEntryComment : function(/*Object*/entry,/*String*/comment) {
	            var item = getEntry(entry);
	            if (item) {
	                item.comment = comment;
	            }
	        },

	        /**
	         * Returns the comment of the specified entry
	         *
	         * @param entry
	         * @return String
	         */
	        getZipEntryComment : function(/*Object*/entry) {
	            var item = getEntry(entry);
	            if (item) {
	                return item.comment || '';
	            }
	            return ''
	        },

	        /**
	         * Updates the content of an existing entry inside the archive. The zip must be rewritten after updating the content
	         *
	         * @param entry
	         * @param content
	         */
	        updateFile : function(/*Object*/entry, /*Buffer*/content) {
	            var item = getEntry(entry);
	            if (item) {
	                item.setData(content);
	            }
	        },

	        /**
	         * Adds a file from the disk to the archive
	         *
	         * @param localPath
	         */
	        addLocalFile : function(/*String*/localPath, /*String*/zipPath, /*String*/zipName) {
	             if (fs.existsSync(localPath)) {
	                if(zipPath){
	                    zipPath=zipPath.split("\\").join("/");
	                    if(zipPath.charAt(zipPath.length - 1) != "/"){
	                        zipPath += "/";
	                    }
	                }else{
	                    zipPath="";
	                }
	                 var p = localPath.split("\\").join("/").split("/").pop();
	                
	                 if(zipName){
	                    this.addFile(zipPath+zipName, fs.readFileSync(localPath), "", 0)
	                 }else{
	                    this.addFile(zipPath+p, fs.readFileSync(localPath), "", 0)
	                 }
	             } else {
	                 throw Utils.Errors.FILE_NOT_FOUND.replace("%s", localPath);
	             }
	        },

	        /**
	         * Adds a local directory and all its nested files and directories to the archive
	         *
	         * @param localPath
	         * @param zipPath optional path inside zip
	         * @param filter optional RegExp or Function if files match will
	         *               be included.
	         */
	        addLocalFolder : function(/*String*/localPath, /*String*/zipPath, /*RegExp|Function*/filter) {
	            if (filter === undefined) {
	              filter = function() { return true; };
	            } else if (filter instanceof RegExp) {
	              filter = function(filter) {
	                return function(filename) {
	                  return filter.test(filename);
	                }
	              }(filter);
	            }

	            if(zipPath){
	                zipPath=zipPath.split("\\").join("/");
	                if(zipPath.charAt(zipPath.length - 1) != "/"){
	                    zipPath += "/";
	                }
	            }else{
	                zipPath="";
	            }
				localPath = localPath.split("\\").join("/"); //windows fix
	            localPath = pth.normalize(localPath);
	            if (localPath.charAt(localPath.length - 1) != "/")
	                localPath += "/";

	            if (fs.existsSync(localPath)) {

	                var items = Utils.findFiles(localPath),
	                    self = this;

	                if (items.length) {
	                    items.forEach(function(path) {
							var p = path.split("\\").join("/").replace( new RegExp(localPath, 'i'), ""); //windows fix
	                        if (filter(p)) {
	                            if (p.charAt(p.length - 1) !== "/") {
	                                self.addFile(zipPath+p, fs.readFileSync(path), "", 0)
	                            } else {
	                                self.addFile(zipPath+p, new Buffer(0), "", 0)
	                            }
	                        }
	                    });
	                }
	            } else {
	                throw Utils.Errors.FILE_NOT_FOUND.replace("%s", localPath);
	            }
	        },

	        /**
	         * Allows you to create a entry (file or directory) in the zip file.
	         * If you want to create a directory the entryName must end in / and a null buffer should be provided.
	         * Comment and attributes are optional
	         *
	         * @param entryName
	         * @param content
	         * @param comment
	         * @param attr
	         */
	        addFile : function(/*String*/entryName, /*Buffer*/content, /*String*/comment, /*Number*/attr) {
	            var entry = new ZipEntry();
	            entry.entryName = entryName;
	            entry.comment = comment || "";
	            entry.attr = attr || 438; //0666;
	            if (entry.isDirectory && content.length) {
	               // throw Utils.Errors.DIRECTORY_CONTENT_ERROR;
	            }
	            entry.setData(content);
	            _zip.setEntry(entry);
	        },

	        /**
	         * Returns an array of ZipEntry objects representing the files and folders inside the archive
	         *
	         * @return Array
	         */
	        getEntries : function() {
	            if (_zip) {
	               return _zip.entries;
	            } else {
	                return [];
	            }
	        },

	        /**
	         * Returns a ZipEntry object representing the file or folder specified by ``name``.
	         *
	         * @param name
	         * @return ZipEntry
	         */
	        getEntry : function(/*String*/name) {
	            return getEntry(name);
	        },

	        /**
	         * Extracts the given entry to the given targetPath
	         * If the entry is a directory inside the archive, the entire directory and it's subdirectories will be extracted
	         *
	         * @param entry ZipEntry object or String with the full path of the entry
	         * @param targetPath Target folder where to write the file
	         * @param maintainEntryPath If maintainEntryPath is true and the entry is inside a folder, the entry folder
	         *                          will be created in targetPath as well. Default is TRUE
	         * @param overwrite If the file already exists at the target path, the file will be overwriten if this is true.
	         *                  Default is FALSE
	         *
	         * @return Boolean
	         */
	        extractEntryTo : function(/*Object*/entry, /*String*/targetPath, /*Boolean*/maintainEntryPath, /*Boolean*/overwrite) {
	            overwrite = overwrite || false;
	            maintainEntryPath = typeof maintainEntryPath == "undefined" ? true : maintainEntryPath;

	            var item = getEntry(entry);
	            if (!item) {
	                throw Utils.Errors.NO_ENTRY;
	            }

	            var target = pth.resolve(targetPath, maintainEntryPath ? item.entryName : pth.basename(item.entryName));

	            if (item.isDirectory) {
	                target = pth.resolve(target, "..");
	                var children = _zip.getEntryChildren(item);
	                children.forEach(function(child) {
	                    if (child.isDirectory) return;
	                    var content = child.getData();
	                    if (!content) {
	                        throw Utils.Errors.CANT_EXTRACT_FILE;
	                    }
	                    Utils.writeFileTo(pth.resolve(targetPath, maintainEntryPath ? child.entryName : child.entryName.substr(item.entryName.length)), content, overwrite);
	                });
	                return true;
	            }

	            var content = item.getData();
	            if (!content) throw Utils.Errors.CANT_EXTRACT_FILE;

	            if (fs.existsSync(target) && !overwrite) {
	                throw Utils.Errors.CANT_OVERRIDE;
	            }
	            Utils.writeFileTo(target, content, overwrite);

	            return true;
	        },

	        /**
	         * Extracts the entire archive to the given location
	         *
	         * @param targetPath Target location
	         * @param overwrite If the file already exists at the target path, the file will be overwriten if this is true.
	         *                  Default is FALSE
	         */
	        extractAllTo : function(/*String*/targetPath, /*Boolean*/overwrite) {
	            overwrite = overwrite || false;
	            if (!_zip) {
	                throw Utils.Errors.NO_ZIP;
	            }

	            _zip.entries.forEach(function(entry) {
	                if (entry.isDirectory) {
	                    Utils.makeDir(pth.resolve(targetPath, entry.entryName.toString()));
	                    return;
	                }
	                var content = entry.getData();
	                if (!content) {
	                    throw Utils.Errors.CANT_EXTRACT_FILE + "2";
	                }
	                Utils.writeFileTo(pth.resolve(targetPath, entry.entryName.toString()), content, overwrite);
	            })
	        },

	        /**
	         * Asynchronous extractAllTo
	         *
	         * @param targetPath Target location
	         * @param overwrite If the file already exists at the target path, the file will be overwriten if this is true.
	         *                  Default is FALSE
	         * @param callback
	         */
	        extractAllToAsync : function(/*String*/targetPath, /*Boolean*/overwrite, /*Function*/callback) {
	            overwrite = overwrite || false;
	            if (!_zip) {
	                callback(new Error(Utils.Errors.NO_ZIP));
	                return;
	            }

	            var entries = _zip.entries;
	            var i = entries.length; 
	            entries.forEach(function(entry) {
	                if(i <= 0) return; // Had an error already

	                if (entry.isDirectory) {
	                    Utils.makeDir(pth.resolve(targetPath, entry.entryName.toString()));
	                    if(--i == 0)
	                        callback(undefined);
	                    return;
	                }
	                entry.getDataAsync(function(content) {
	                    if(i <= 0) return;
	                    if (!content) {
	                        i = 0;
	                        callback(new Error(Utils.Errors.CANT_EXTRACT_FILE + "2"));
	                        return;
	                    }
	                    Utils.writeFileToAsync(pth.resolve(targetPath, entry.entryName.toString()), content, overwrite, function(succ) {
	                        if(i <= 0) return;

	                        if(!succ) {
	                            i = 0;
	                            callback(new Error('Unable to write'));
	                            return;
	                        }

	                        if(--i == 0)
	                            callback(undefined);
	                    });
	                    
	                });
	            })
	        },

	        /**
	         * Writes the newly created zip file to disk at the specified location or if a zip was opened and no ``targetFileName`` is provided, it will overwrite the opened zip
	         *
	         * @param targetFileName
	         * @param callback
	         */
	        writeZip : function(/*String*/targetFileName, /*Function*/callback) {
	            if (arguments.length == 1) {
	                if (typeof targetFileName == "function") {
	                    callback = targetFileName;
	                    targetFileName = "";
	                }
	            }

	            if (!targetFileName && _filename) {
	                targetFileName = _filename;
	            }
	            if (!targetFileName) return;

	            var zipData = _zip.compressToBuffer();
	            if (zipData) {
	                var ok = Utils.writeFileTo(targetFileName, zipData, true);
	                if (typeof callback == 'function') callback(!ok? new Error("failed"): null, "");
	            }
	        },

	        /**
	         * Returns the content of the entire zip file as a Buffer object
	         *
	         * @return Buffer
	         */
	        toBuffer : function(/*Function*/onSuccess,/*Function*/onFail,/*Function*/onItemStart,/*Function*/onItemEnd) {
	            this.valueOf = 2;
	            if (typeof onSuccess == "function") {
	                _zip.toAsyncBuffer(onSuccess,onFail,onItemStart,onItemEnd);
	                return null;
	            }
	            return _zip.compressToBuffer()
	        }
	    }
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(9),
	    Headers = __webpack_require__(14),
	    Constants = Utils.Constants,
	    Methods = __webpack_require__(17);

	module.exports = function (/*Buffer*/input) {

	    var _entryHeader = new Headers.EntryHeader(),
	        _entryName = new Buffer(0),
	        _comment = new Buffer(0),
	        _isDirectory = false,
	        uncompressedData = null,
	        _extra = new Buffer(0);

	    function getCompressedDataFromZip() {
	        if (!input || !Buffer.isBuffer(input)) {
	            return new Buffer(0);
	        }
	        _entryHeader.loadDataHeaderFromBinary(input);
	        return input.slice(_entryHeader.realDataOffset, _entryHeader.realDataOffset + _entryHeader.compressedSize)
	    }

	    function crc32OK(data) {
	        // if bit 3 (0x08) of the general-purpose flags field is set, then the CRC-32 and file sizes are not known when the header is written
	        if (_entryHeader.flags & 0x8 != 0x8) {
	           if (Utils.crc32(data) != _entryHeader.crc) {
	               return false;
	           }
	        } else {
	            // @TODO: load and check data descriptor header
	            // The fields in the local header are filled with zero, and the CRC-32 and size are appended in a 12-byte structure
	            // (optionally preceded by a 4-byte signature) immediately after the compressed data:
	        }
	        return true;
	    }

	    function decompress(/*Boolean*/async, /*Function*/callback, /*String*/pass) {
	        if(typeof callback === 'undefined' && typeof async === 'string') {
	            pass=async;
	            async=void 0;
	        }
	        if (_isDirectory) {
	            if (async && callback) {
	                callback(new Buffer(0), Utils.Errors.DIRECTORY_CONTENT_ERROR); //si added error.
	            }
	            return new Buffer(0);
	        }

	        var compressedData = getCompressedDataFromZip();
	       
	        if (compressedData.length == 0) {
	            if (async && callback) callback(compressedData, Utils.Errors.NO_DATA);//si added error.
	            return compressedData;
	        }

	        var data = new Buffer(_entryHeader.size);
	        data.fill(0);

	        switch (_entryHeader.method) {
	            case Utils.Constants.STORED:
	                compressedData.copy(data);
	                if (!crc32OK(data)) {
	                    if (async && callback) callback(data, Utils.Errors.BAD_CRC);//si added error
	                    return Utils.Errors.BAD_CRC;
	                } else {//si added otherwise did not seem to return data.
	                    if (async && callback) callback(data);
	                    return data;
	                }
	                break;
	            case Utils.Constants.DEFLATED:
	                var inflater = new Methods.Inflater(compressedData);
	                if (!async) {
	                    inflater.inflate(data);
	                    if (!crc32OK(data)) {
	                        console.warn(Utils.Errors.BAD_CRC + " " + _entryName.toString())
	                    }
	                    return data;
	                } else {
	                    inflater.inflateAsync(function(result) {
	                        result.copy(data, 0);
	                        if (!crc32OK(data)) {
	                            if (callback) callback(data, Utils.Errors.BAD_CRC); //si added error
	                        } else { //si added otherwise did not seem to return data.
	                            if (callback) callback(data);
	                        }
	                    })
	                }
	                break;
	            default:
	                if (async && callback) callback(new Buffer(0), Utils.Errors.UNKNOWN_METHOD);
	                return Utils.Errors.UNKNOWN_METHOD;
	        }
	    }

	    function compress(/*Boolean*/async, /*Function*/callback) {
	        if ((!uncompressedData || !uncompressedData.length) && Buffer.isBuffer(input)) {
	            // no data set or the data wasn't changed to require recompression
	            if (async && callback) callback(getCompressedDataFromZip());
	            return getCompressedDataFromZip();
	        }

	        if (uncompressedData.length && !_isDirectory) {
	            var compressedData;
	            // Local file header
	            switch (_entryHeader.method) {
	                case Utils.Constants.STORED:
	                    _entryHeader.compressedSize = _entryHeader.size;

	                    compressedData = new Buffer(uncompressedData.length);
	                    uncompressedData.copy(compressedData);

	                    if (async && callback) callback(compressedData);
	                    return compressedData;

	                    break;
	                default:
	                case Utils.Constants.DEFLATED:

	                    var deflater = new Methods.Deflater(uncompressedData);
	                    if (!async) {
	                        var deflated = deflater.deflate();
	                        _entryHeader.compressedSize = deflated.length;
	                        return deflated;
	                    } else {
	                        deflater.deflateAsync(function(data) {
	                            compressedData = new Buffer(data.length);
	                            _entryHeader.compressedSize = data.length;
	                            data.copy(compressedData);
	                            callback && callback(compressedData);
	                        })
	                    }
	                    deflater = null;
	                    break;
	            }
	        } else {
	            if (async && callback) {
	                callback(new Buffer(0));
	            } else {
	                return new Buffer(0);
	            }
	        }
	    }

	    function readUInt64LE(buffer, offset) {
	        return (buffer.readUInt32LE(offset + 4) << 4) + buffer.readUInt32LE(offset);
	    }

	    function parseExtra(data) {
	        var offset = 0;
	        var signature, size, part;
	        while(offset<data.length) {
	            signature = data.readUInt16LE(offset);
	            offset += 2;
	            size = data.readUInt16LE(offset);
	            offset += 2;
	            part = data.slice(offset, offset+size);
	            offset += size;
	            if(Constants.ID_ZIP64 === signature) {
	                parseZip64ExtendedInformation(part);
	            }
	        }
	    }

	    //Override header field values with values from the ZIP64 extra field
	    function parseZip64ExtendedInformation(data) {
	        var size, compressedSize, offset, diskNumStart;

	        if(data.length >= Constants.EF_ZIP64_SCOMP) {
	            size = readUInt64LE(data, Constants.EF_ZIP64_SUNCOMP);
	            if(_entryHeader.size === Constants.EF_ZIP64_OR_32) {
	                _entryHeader.size = size;
	            }
	        }
	        if(data.length >= Constants.EF_ZIP64_RHO) {
	            compressedSize = readUInt64LE(data, Constants.EF_ZIP64_SCOMP);
	            if(_entryHeader.compressedSize === Constants.EF_ZIP64_OR_32) {
	                _entryHeader.compressedSize = compressedSize;
	            }
	        }
	        if(data.length >= Constants.EF_ZIP64_DSN) {
	            offset = readUInt64LE(data, Constants.EF_ZIP64_RHO);
	            if(_entryHeader.offset === Constants.EF_ZIP64_OR_32) {
	                _entryHeader.offset = offset;
	            }
	        }
	        if(data.length >= Constants.EF_ZIP64_DSN+4) {
	            diskNumStart = data.readUInt32LE(Constants.EF_ZIP64_DSN);
	            if(_entryHeader.diskNumStart === Constants.EF_ZIP64_OR_16) {
	                _entryHeader.diskNumStart = diskNumStart;
	            }
	        }
	    }


	    return {
	        get entryName () { return _entryName.toString(); },
	        get rawEntryName() { return _entryName; },
	        set entryName (val) {
	            _entryName = Utils.toBuffer(val);
	            var lastChar = _entryName[_entryName.length - 1];
	            _isDirectory = (lastChar == 47) || (lastChar == 92);
	            _entryHeader.fileNameLength = _entryName.length;
	        },

	        get extra () { return _extra; },
	        set extra (val) {
	            _extra = val;
	            _entryHeader.extraLength = val.length;
	            parseExtra(val);
	        },

	        get comment () { return _comment.toString(); },
	        set comment (val) {
	            _comment = Utils.toBuffer(val);
	            _entryHeader.commentLength = _comment.length;
	        },

	        get name () { var n = _entryName.toString(); return _isDirectory ? n.substr(n.length - 1).split("/").pop() : n.split("/").pop(); },
	        get isDirectory () { return _isDirectory },

	        getCompressedData : function() {
	            return compress(false, null)
	        },

	        getCompressedDataAsync : function(/*Function*/callback) {
	            compress(true, callback)
	        },

	        setData : function(value) {
	            uncompressedData = Utils.toBuffer(value);
	            if (!_isDirectory && uncompressedData.length) {
	                _entryHeader.size = uncompressedData.length;
	                _entryHeader.method = Utils.Constants.DEFLATED;
	                _entryHeader.crc = Utils.crc32(value);
	            } else { // folders and blank files should be stored
	                _entryHeader.method = Utils.Constants.STORED;
	            }
	        },

	        getData : function(pass) {
	            return decompress(false, null, pass);
	        },

	        getDataAsync : function(/*Function*/callback, pass) {
	            decompress(true, callback, pass)
	        },

	        set attr(attr) { _entryHeader.attr = attr; },
	        get attr() { return _entryHeader.attr; },

	        set header(/*Buffer*/data) {
	            _entryHeader.loadFromBinary(data);
	        },

	        get header() {
	            return _entryHeader;
	        },

	        packHeader : function() {
	            var header = _entryHeader.entryHeaderToBinary();
	            // add
	            _entryName.copy(header, Utils.Constants.CENHDR);
	            if (_entryHeader.extraLength) {
	                _extra.copy(header, Utils.Constants.CENHDR + _entryName.length)
	            }
	            if (_entryHeader.commentLength) {
	                _comment.copy(header, Utils.Constants.CENHDR + _entryName.length + _entryHeader.extraLength, _comment.length);
	            }
	            return header;
	        },

	        toString : function() {
	            return '{\n' +
	                '\t"entryName" : "' + _entryName.toString() + "\",\n" +
	                '\t"name" : "' + _entryName.toString().split("/").pop() + "\",\n" +
	                '\t"comment" : "' + _comment.toString() + "\",\n" +
	                '\t"isDirectory" : ' + _isDirectory + ",\n" +
	                '\t"header" : ' + _entryHeader.toString().replace(/\t/mg, "\t\t") + ",\n" +
	                '\t"compressedData" : <' + (input && input.length  + " bytes buffer" || "null") + ">\n" +
	                '\t"data" : <' + (uncompressedData && uncompressedData.length  + " bytes buffer" || "null") + ">\n" +
	                '}';
	        }
	    }
	};


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = __webpack_require__(10);
	module.exports.Constants = __webpack_require__(11);
	module.exports.Errors = __webpack_require__(12);
	module.exports.FileAttr = __webpack_require__(13);

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(5),
	    pth = __webpack_require__(6);

	fs.existsSync = fs.existsSync || pth.existsSync;

	module.exports = (function() {

	    var crcTable = [],
	        Constants = __webpack_require__(11),
	        Errors = __webpack_require__(12),

	        PATH_SEPARATOR = pth.normalize("/");


	    function mkdirSync(/*String*/path) {
	        var resolvedPath = path.split(PATH_SEPARATOR)[0];
	        path.split(PATH_SEPARATOR).forEach(function(name) {
	            if (!name || name.substr(-1,1) == ":") return;
	            resolvedPath += PATH_SEPARATOR + name;
	            var stat;
	            try {
	                stat = fs.statSync(resolvedPath);
	            } catch (e) {
	                fs.mkdirSync(resolvedPath);
	            }
	            if (stat && stat.isFile())
	                throw Errors.FILE_IN_THE_WAY.replace("%s", resolvedPath);
	        });
	    }

	    function findSync(/*String*/root, /*RegExp*/pattern, /*Boolean*/recoursive) {
	        if (typeof pattern === 'boolean') {
	            recoursive = pattern;
	            pattern = undefined;
	        }
	        var files = [];
	        fs.readdirSync(root).forEach(function(file) {
	            var path = pth.join(root, file);

	            if (fs.statSync(path).isDirectory() && recoursive)
	                files = files.concat(findSync(path, pattern, recoursive));

	            if (!pattern || pattern.test(path)) {
	                files.push(pth.normalize(path) + (fs.statSync(path).isDirectory() ? PATH_SEPARATOR : ""));
	            }

	        });
	        return files;
	    }

	    return {
	        makeDir : function(/*String*/path) {
	            mkdirSync(path);
	        },

	        crc32 : function(buf) {
	            var b = new Buffer(4);
	            if (!crcTable.length) {
	                for (var n = 0; n < 256; n++) {
	                    var c = n;
	                    for (var k = 8; --k >= 0;)  //
	                        if ((c & 1) != 0)  { c = 0xedb88320 ^ (c >>> 1); } else { c = c >>> 1; }
	                    if (c < 0) {
	                        b.writeInt32LE(c, 0);
	                        c = b.readUInt32LE(0);
	                    }
	                    crcTable[n] = c;
	                }
	            }
	            var crc = 0, off = 0, len = buf.length, c1 = ~crc;
	            while(--len >= 0) c1 = crcTable[(c1 ^ buf[off++]) & 0xff] ^ (c1 >>> 8);
	            crc = ~c1;
	            b.writeInt32LE(crc & 0xffffffff, 0);
	            return b.readUInt32LE(0);
	        },

	        methodToString : function(/*Number*/method) {
	            switch (method) {
	                case Constants.STORED:
	                    return 'STORED (' + method + ')';
	                case Constants.DEFLATED:
	                    return 'DEFLATED (' + method + ')';
	                default:
	                    return 'UNSUPPORTED (' + method + ')';
	            }

	        },

	        writeFileTo : function(/*String*/path, /*Buffer*/content, /*Boolean*/overwrite, /*Number*/attr) {
	            if (fs.existsSync(path)) {
	                if (!overwrite)
	                    return false; // cannot overwite

	                var stat = fs.statSync(path);
	                if (stat.isDirectory()) {
	                    return false;
	                }
	            }
	            var folder = pth.dirname(path);
	            if (!fs.existsSync(folder)) {
	                mkdirSync(folder);
	            }

	            var fd;
	            try {
	                fd = fs.openSync(path, 'w', 438); // 0666
	            } catch(e) {
	                fs.chmodSync(path, 438);
	                fd = fs.openSync(path, 'w', 438);
	            }
	            if (fd) {
	                fs.writeSync(fd, content, 0, content.length, 0);
	                fs.closeSync(fd);
	            }
	            fs.chmodSync(path, attr || 438);
	            return true;
	        },

	        writeFileToAsync : function(/*String*/path, /*Buffer*/content, /*Boolean*/overwrite, /*Number*/attr, /*Function*/callback) {
	            if(typeof attr === 'function') {
	                callback = attr;
	                attr = undefined;
	            }

	            fs.exists(path, function(exists) {
	                if(exists && !overwrite)
	                    return callback(false);

	                fs.stat(path, function(err, stat) {
	                    if(exists &&stat.isDirectory()) {
	                        return callback(false);
	                    }

	                    var folder = pth.dirname(path);
	                    fs.exists(folder, function(exists) {
	                        if(!exists)
	                            mkdirSync(folder);
	                        
	                        fs.open(path, 'w', 438, function(err, fd) {
	                            if(err) {
	                                fs.chmod(path, 438, function(err) {
	                                    fs.open(path, 'w', 438, function(err, fd) {
	                                        fs.write(fd, content, 0, content.length, 0, function(err, written, buffer) {
	                                            fs.close(fd, function(err) {
	                                                fs.chmod(path, attr || 438, function() {
	                                                    callback(true);
	                                                })
	                                            });
	                                        });
	                                    });
	                                })
	                            } else {
	                                if(fd) {
	                                    fs.write(fd, content, 0, content.length, 0, function(err, written, buffer) {
	                                        fs.close(fd, function(err) {
	                                            fs.chmod(path, attr || 438, function() {
	                                                callback(true);
	                                            })
	                                        });
	                                    });
	                                } else {
	                                    fs.chmod(path, attr || 438, function() {
	                                        callback(true);
	                                    })
	                                }
	                            }
	                        });
	                    })
	                })
	            })
	        },

	        findFiles : function(/*String*/path) {
	            return findSync(path, true);
	        },

	        getAttributes : function(/*String*/path) {

	        },

	        setAttributes : function(/*String*/path) {

	        },

	        toBuffer : function(input) {
	            if (Buffer.isBuffer(input)) {
	                return input;
	            } else {
	                if (input.length == 0) {
	                    return new Buffer(0)
	                }
	                return new Buffer(input, 'utf8');
	            }
	        },

	        Constants : Constants,
	        Errors : Errors
	    }
	})();


/***/ },
/* 11 */
/***/ function(module, exports) {

	module.exports = {
	    /* The local file header */
	    LOCHDR           : 30, // LOC header size
	    LOCSIG           : 0x04034b50, // "PK\003\004"
	    LOCVER           : 4,	// version needed to extract
	    LOCFLG           : 6, // general purpose bit flag
	    LOCHOW           : 8, // compression method
	    LOCTIM           : 10, // modification time (2 bytes time, 2 bytes date)
	    LOCCRC           : 14, // uncompressed file crc-32 value
	    LOCSIZ           : 18, // compressed size
	    LOCLEN           : 22, // uncompressed size
	    LOCNAM           : 26, // filename length
	    LOCEXT           : 28, // extra field length

	    /* The Data descriptor */
	    EXTSIG           : 0x08074b50, // "PK\007\008"
	    EXTHDR           : 16, // EXT header size
	    EXTCRC           : 4, // uncompressed file crc-32 value
	    EXTSIZ           : 8, // compressed size
	    EXTLEN           : 12, // uncompressed size

	    /* The central directory file header */
	    CENHDR           : 46, // CEN header size
	    CENSIG           : 0x02014b50, // "PK\001\002"
	    CENVEM           : 4, // version made by
	    CENVER           : 6, // version needed to extract
	    CENFLG           : 8, // encrypt, decrypt flags
	    CENHOW           : 10, // compression method
	    CENTIM           : 12, // modification time (2 bytes time, 2 bytes date)
	    CENCRC           : 16, // uncompressed file crc-32 value
	    CENSIZ           : 20, // compressed size
	    CENLEN           : 24, // uncompressed size
	    CENNAM           : 28, // filename length
	    CENEXT           : 30, // extra field length
	    CENCOM           : 32, // file comment length
	    CENDSK           : 34, // volume number start
	    CENATT           : 36, // internal file attributes
	    CENATX           : 38, // external file attributes (host system dependent)
	    CENOFF           : 42, // LOC header offset

	    /* The entries in the end of central directory */
	    ENDHDR           : 22, // END header size
	    ENDSIG           : 0x06054b50, // "PK\005\006"
	    ENDSUB           : 8, // number of entries on this disk
	    ENDTOT           : 10, // total number of entries
	    ENDSIZ           : 12, // central directory size in bytes
	    ENDOFF           : 16, // offset of first CEN header
	    ENDCOM           : 20, // zip file comment length

	    /* Compression methods */
	    STORED           : 0, // no compression
	    SHRUNK           : 1, // shrunk
	    REDUCED1         : 2, // reduced with compression factor 1
	    REDUCED2         : 3, // reduced with compression factor 2
	    REDUCED3         : 4, // reduced with compression factor 3
	    REDUCED4         : 5, // reduced with compression factor 4
	    IMPLODED         : 6, // imploded
	    // 7 reserved
	    DEFLATED         : 8, // deflated
	    ENHANCED_DEFLATED: 9, // enhanced deflated
	    PKWARE           : 10,// PKWare DCL imploded
	    // 11 reserved
	    BZIP2            : 12, //  compressed using BZIP2
	    // 13 reserved
	    LZMA             : 14, // LZMA
	    // 15-17 reserved
	    IBM_TERSE        : 18, // compressed using IBM TERSE
	    IBM_LZ77         : 19, //IBM LZ77 z

	    /* General purpose bit flag */
	    FLG_ENC          : 0,  // encripted file
	    FLG_COMP1        : 1,  // compression option
	    FLG_COMP2        : 2,  // compression option
	    FLG_DESC         : 4,  // data descriptor
	    FLG_ENH          : 8,  // enhanced deflation
	    FLG_STR          : 16, // strong encryption
	    FLG_LNG          : 1024, // language encoding
	    FLG_MSK          : 4096, // mask header values

	    /* Load type */
	    FILE             : 0,
	    BUFFER           : 1,
	    NONE             : 2,

	    /* 4.5 Extensible data fields */
	    EF_ID            : 0,
	    EF_SIZE          : 2,

	    /* Header IDs */
	    ID_ZIP64         : 0x0001,
	    ID_AVINFO        : 0x0007,
	    ID_PFS           : 0x0008,
	    ID_OS2           : 0x0009,
	    ID_NTFS          : 0x000a,
	    ID_OPENVMS       : 0x000c,
	    ID_UNIX          : 0x000d,
	    ID_FORK          : 0x000e,
	    ID_PATCH         : 0x000f,
	    ID_X509_PKCS7    : 0x0014,
	    ID_X509_CERTID_F : 0x0015,
	    ID_X509_CERTID_C : 0x0016,
	    ID_STRONGENC     : 0x0017,
	    ID_RECORD_MGT    : 0x0018,
	    ID_X509_PKCS7_RL : 0x0019,
	    ID_IBM1          : 0x0065,
	    ID_IBM2          : 0x0066,
	    ID_POSZIP        : 0x4690,

	    EF_ZIP64_OR_32   : 0xffffffff,
	    EF_ZIP64_OR_16   : 0xffff,
	    EF_ZIP64_SUNCOMP : 0,
	    EF_ZIP64_SCOMP   : 8,
	    EF_ZIP64_RHO     : 16,
	    EF_ZIP64_DSN     : 24
	};


/***/ },
/* 12 */
/***/ function(module, exports) {

	module.exports = {
	    /* Header error messages */
	    "INVALID_LOC" : "Invalid LOC header (bad signature)",
	    "INVALID_CEN" : "Invalid CEN header (bad signature)",
	    "INVALID_END" : "Invalid END header (bad signature)",

	    /* ZipEntry error messages*/
	    "NO_DATA" : "Nothing to decompress",
	    "BAD_CRC" : "CRC32 checksum failed",
	    "FILE_IN_THE_WAY" : "There is a file in the way: %s",
	    "UNKNOWN_METHOD" : "Invalid/unsupported compression method",

	    /* Inflater error messages */
	    "AVAIL_DATA" : "inflate::Available inflate data did not terminate",
	    "INVALID_DISTANCE" : "inflate::Invalid literal/length or distance code in fixed or dynamic block",
	    "TO_MANY_CODES" : "inflate::Dynamic block code description: too many length or distance codes",
	    "INVALID_REPEAT_LEN" : "inflate::Dynamic block code description: repeat more than specified lengths",
	    "INVALID_REPEAT_FIRST" : "inflate::Dynamic block code description: repeat lengths with no first length",
	    "INCOMPLETE_CODES" : "inflate::Dynamic block code description: code lengths codes incomplete",
	    "INVALID_DYN_DISTANCE": "inflate::Dynamic block code description: invalid distance code lengths",
	    "INVALID_CODES_LEN": "inflate::Dynamic block code description: invalid literal/length code lengths",
	    "INVALID_STORE_BLOCK" : "inflate::Stored block length did not match one's complement",
	    "INVALID_BLOCK_TYPE" : "inflate::Invalid block type (type == 3)",

	    /* ADM-ZIP error messages */
	    "CANT_EXTRACT_FILE" : "Could not extract the file",
	    "CANT_OVERRIDE" : "Target file already exists",
	    "NO_ZIP" : "No zip file was loaded",
	    "NO_ENTRY" : "Entry doesn't exist",
	    "DIRECTORY_CONTENT_ERROR" : "A directory cannot have content",
	    "FILE_NOT_FOUND" : "File not found: %s",
	    "NOT_IMPLEMENTED" : "Not implemented",
	    "INVALID_FILENAME" : "Invalid filename",
	    "INVALID_FORMAT" : "Invalid or unsupported zip format. No END header found"
	};

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	var fs = __webpack_require__(5),
	    pth = __webpack_require__(6);
		
	fs.existsSync = fs.existsSync || pth.existsSync;

	module.exports = function(/*String*/path) {

	    var _path = path || "",
	        _permissions = 0,
	        _obj = newAttr(),
	        _stat = null;

	    function newAttr() {
	        return {
	            directory : false,
	            readonly : false,
	            hidden : false,
	            executable : false,
	            mtime : 0,
	            atime : 0
	        }
	    }

	    if (_path && fs.existsSync(_path)) {
	        _stat = fs.statSync(_path);
	        _obj.directory = _stat.isDirectory();
	        _obj.mtime = _stat.mtime;
	        _obj.atime = _stat.atime;
	        _obj.executable = !!(1 & parseInt ((_stat.mode & parseInt ("777", 8)).toString (8)[0]));
	        _obj.readonly = !!(2 & parseInt ((_stat.mode & parseInt ("777", 8)).toString (8)[0]));
	        _obj.hidden = pth.basename(_path)[0] === ".";
	    } else {
	        console.warn("Invalid path: " + _path)
	    }

	    return {

	        get directory () {
	            return _obj.directory;
	        },

	        get readOnly () {
	            return _obj.readonly;
	        },

	        get hidden () {
	            return _obj.hidden;
	        },

	        get mtime () {
	            return _obj.mtime;
	        },

	        get atime () {
	           return _obj.atime;
	        },


	        get executable () {
	            return _obj.executable;
	        },

	        decodeAttributes : function(val) {

	        },

	        encodeAttributes : function (val) {

	        },

	        toString : function() {
	           return '{\n' +
	               '\t"path" : "' + _path + ",\n" +
	               '\t"isDirectory" : ' + _obj.directory + ",\n" +
	               '\t"isReadOnly" : ' + _obj.readonly + ",\n" +
	               '\t"isHidden" : ' + _obj.hidden + ",\n" +
	               '\t"isExecutable" : ' + _obj.executable + ",\n" +
	               '\t"mTime" : ' + _obj.mtime + "\n" +
	               '\t"aTime" : ' + _obj.atime + "\n" +
	           '}';
	        }
	    }

	};


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

	exports.EntryHeader = __webpack_require__(15);
	exports.MainHeader = __webpack_require__(16);


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(9),
	    Constants = Utils.Constants;

	/* The central directory file header */
	module.exports = function () {
	    var _verMade = 0x0A,
	        _version = 0x0A,
	        _flags = 0,
	        _method = 0,
	        _time = 0,
	        _crc = 0,
	        _compressedSize = 0,
	        _size = 0,
	        _fnameLen = 0,
	        _extraLen = 0,

	        _comLen = 0,
	        _diskStart = 0,
	        _inattr = 0,
	        _attr = 0,
	        _offset = 0;

	    var _dataHeader = {};

	    function setTime(val) {
	        var val = new Date(val);
	        _time = (val.getFullYear() - 1980 & 0x7f) << 25  // b09-16 years from 1980
	            | (val.getMonth() + 1) << 21                 // b05-08 month
	            | val.getDay() << 16                         // b00-04 hour

	            // 2 bytes time
	            | val.getHours() << 11    // b11-15 hour
	            | val.getMinutes() << 5   // b05-10 minute
	            | val.getSeconds() >> 1;  // b00-04 seconds divided by 2
	    }

	    setTime(+new Date());

	    return {
	        get made () { return _verMade; },
	        set made (val) { _verMade = val; },

	        get version () { return _version; },
	        set version (val) { _version = val },

	        get flags () { return _flags },
	        set flags (val) { _flags = val; },

	        get method () { return _method; },
	        set method (val) { _method = val; },

	        get time () { return new Date(
	            ((_time >> 25) & 0x7f) + 1980,
	            ((_time >> 21) & 0x0f) - 1,
	            (_time >> 16) & 0x1f,
	            (_time >> 11) & 0x1f,
	            (_time >> 5) & 0x3f,
	            (_time & 0x1f) << 1
	        );
	        },
	        set time (val) {
	            setTime(val);
	        },

	        get crc () { return _crc; },
	        set crc (val) { _crc = val; },

	        get compressedSize () { return _compressedSize; },
	        set compressedSize (val) { _compressedSize = val; },

	        get size () { return _size; },
	        set size (val) { _size = val; },

	        get fileNameLength () { return _fnameLen; },
	        set fileNameLength (val) { _fnameLen = val; },

	        get extraLength () { return _extraLen },
	        set extraLength (val) { _extraLen = val; },

	        get commentLength () { return _comLen },
	        set commentLength (val) { _comLen = val },

	        get diskNumStart () { return _diskStart },
	        set diskNumStart (val) { _diskStart = val },

	        get inAttr () { return _inattr },
	        set inAttr (val) { _inattr = val },

	        get attr () { return _attr },
	        set attr (val) { _attr = val },

	        get offset () { return _offset },
	        set offset (val) { _offset = val },

	        get encripted () { return (_flags & 1) == 1 },

	        get entryHeaderSize () {
	            return Constants.CENHDR + _fnameLen + _extraLen + _comLen;
	        },

	        get realDataOffset () {
	            return _offset + Constants.LOCHDR + _dataHeader.fnameLen + _dataHeader.extraLen;
	        },

	        get dataHeader () {
	            return _dataHeader;
	        },

	        loadDataHeaderFromBinary : function(/*Buffer*/input) {
	            var data = input.slice(_offset, _offset + Constants.LOCHDR);
	            // 30 bytes and should start with "PK\003\004"
	            if (data.readUInt32LE(0) != Constants.LOCSIG) {
	                throw Utils.Errors.INVALID_LOC;
	            }
	            _dataHeader = {
	                // version needed to extract
	                version : data.readUInt16LE(Constants.LOCVER),
	                // general purpose bit flag
	                flags : data.readUInt16LE(Constants.LOCFLG),
	                // compression method
	                method : data.readUInt16LE(Constants.LOCHOW),
	                // modification time (2 bytes time, 2 bytes date)
	                time : data.readUInt32LE(Constants.LOCTIM),
	                // uncompressed file crc-32 value
	                crc : data.readUInt32LE(Constants.LOCCRC),
	                // compressed size
	                compressedSize : data.readUInt32LE(Constants.LOCSIZ),
	                // uncompressed size
	                size : data.readUInt32LE(Constants.LOCLEN),
	                // filename length
	                fnameLen : data.readUInt16LE(Constants.LOCNAM),
	                // extra field length
	                extraLen : data.readUInt16LE(Constants.LOCEXT)
	            }
	        },

	        loadFromBinary : function(/*Buffer*/data) {
	            // data should be 46 bytes and start with "PK 01 02"
	            if (data.length != Constants.CENHDR || data.readUInt32LE(0) != Constants.CENSIG) {
	                throw Utils.Errors.INVALID_CEN;
	            }
	            // version made by
	            _verMade = data.readUInt16LE(Constants.CENVEM);
	            // version needed to extract
	            _version = data.readUInt16LE(Constants.CENVER);
	            // encrypt, decrypt flags
	            _flags = data.readUInt16LE(Constants.CENFLG);
	            // compression method
	            _method = data.readUInt16LE(Constants.CENHOW);
	            // modification time (2 bytes time, 2 bytes date)
	            _time = data.readUInt32LE(Constants.CENTIM);
	            // uncompressed file crc-32 value
	            _crc = data.readUInt32LE(Constants.CENCRC);
	            // compressed size
	            _compressedSize = data.readUInt32LE(Constants.CENSIZ);
	            // uncompressed size
	            _size = data.readUInt32LE(Constants.CENLEN);
	            // filename length
	            _fnameLen = data.readUInt16LE(Constants.CENNAM);
	            // extra field length
	            _extraLen = data.readUInt16LE(Constants.CENEXT);
	            // file comment length
	            _comLen = data.readUInt16LE(Constants.CENCOM);
	            // volume number start
	            _diskStart = data.readUInt16LE(Constants.CENDSK);
	            // internal file attributes
	            _inattr = data.readUInt16LE(Constants.CENATT);
	            // external file attributes
	            _attr = data.readUInt32LE(Constants.CENATX);
	            // LOC header offset
	            _offset = data.readUInt32LE(Constants.CENOFF);
	        },

	        dataHeaderToBinary : function() {
	            // LOC header size (30 bytes)
	            var data = new Buffer(Constants.LOCHDR);
	            // "PK\003\004"
	            data.writeUInt32LE(Constants.LOCSIG, 0);
	            // version needed to extract
	            data.writeUInt16LE(_version, Constants.LOCVER);
	            // general purpose bit flag
	            data.writeUInt16LE(_flags, Constants.LOCFLG);
	            // compression method
	            data.writeUInt16LE(_method, Constants.LOCHOW);
	            // modification time (2 bytes time, 2 bytes date)
	            data.writeUInt32LE(_time, Constants.LOCTIM);
	            // uncompressed file crc-32 value
	            data.writeUInt32LE(_crc, Constants.LOCCRC);
	            // compressed size
	            data.writeUInt32LE(_compressedSize, Constants.LOCSIZ);
	            // uncompressed size
	            data.writeUInt32LE(_size, Constants.LOCLEN);
	            // filename length
	            data.writeUInt16LE(_fnameLen, Constants.LOCNAM);
	            // extra field length
	            data.writeUInt16LE(_extraLen, Constants.LOCEXT);
	            return data;
	        },

	        entryHeaderToBinary : function() {
	            // CEN header size (46 bytes)
	            var data = new Buffer(Constants.CENHDR + _fnameLen + _extraLen + _comLen);
	            // "PK\001\002"
	            data.writeUInt32LE(Constants.CENSIG, 0);
	            // version made by
	            data.writeUInt16LE(_verMade, Constants.CENVEM);
	            // version needed to extract
	            data.writeUInt16LE(_version, Constants.CENVER);
	            // encrypt, decrypt flags
	            data.writeUInt16LE(_flags, Constants.CENFLG);
	            // compression method
	            data.writeUInt16LE(_method, Constants.CENHOW);
	            // modification time (2 bytes time, 2 bytes date)
	            data.writeUInt32LE(_time, Constants.CENTIM);
	            // uncompressed file crc-32 value
	            data.writeInt32LE(_crc, Constants.CENCRC, true);
	            // compressed size
	            data.writeUInt32LE(_compressedSize, Constants.CENSIZ);
	            // uncompressed size
	            data.writeUInt32LE(_size, Constants.CENLEN);
	            // filename length
	            data.writeUInt16LE(_fnameLen, Constants.CENNAM);
	            // extra field length
	            data.writeUInt16LE(_extraLen, Constants.CENEXT);
	            // file comment length
	            data.writeUInt16LE(_comLen, Constants.CENCOM);
	            // volume number start
	            data.writeUInt16LE(_diskStart, Constants.CENDSK);
	            // internal file attributes
	            data.writeUInt16LE(_inattr, Constants.CENATT);
	            // external file attributes
	            data.writeUInt32LE(_attr, Constants.CENATX);
	            // LOC header offset
	            data.writeUInt32LE(_offset, Constants.CENOFF);
	            // fill all with
	            data.fill(0x00, Constants.CENHDR);
	            return data;
	        },

	        toString : function() {
	            return '{\n' +
	                '\t"made" : ' + _verMade + ",\n" +
	                '\t"version" : ' + _version + ",\n" +
	                '\t"flags" : ' + _flags + ",\n" +
	                '\t"method" : ' + Utils.methodToString(_method) + ",\n" +
	                '\t"time" : ' + _time + ",\n" +
	                '\t"crc" : 0x' + _crc.toString(16).toUpperCase() + ",\n" +
	                '\t"compressedSize" : ' + _compressedSize + " bytes,\n" +
	                '\t"size" : ' + _size + " bytes,\n" +
	                '\t"fileNameLength" : ' + _fnameLen + ",\n" +
	                '\t"extraLength" : ' + _extraLen + " bytes,\n" +
	                '\t"commentLength" : ' + _comLen + " bytes,\n" +
	                '\t"diskNumStart" : ' + _diskStart + ",\n" +
	                '\t"inAttr" : ' + _inattr + ",\n" +
	                '\t"attr" : ' + _attr + ",\n" +
	                '\t"offset" : ' + _offset + ",\n" +
	                '\t"entryHeaderSize" : ' + (Constants.CENHDR + _fnameLen + _extraLen + _comLen) + " bytes\n" +
	                '}';
	        }
	    }
	};


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	var Utils = __webpack_require__(9),
	    Constants = Utils.Constants;

	/* The entries in the end of central directory */
	module.exports = function () {
	    var _volumeEntries = 0,
	        _totalEntries = 0,
	        _size = 0,
	        _offset = 0,
	        _commentLength = 0;

	    return {
	        get diskEntries () { return _volumeEntries },
	        set diskEntries (/*Number*/val) { _volumeEntries = _totalEntries = val; },

	        get totalEntries () { return _totalEntries },
	        set totalEntries (/*Number*/val) { _totalEntries = _volumeEntries = val; },

	        get size () { return _size },
	        set size (/*Number*/val) { _size = val; },

	        get offset () { return _offset },
	        set offset (/*Number*/val) { _offset = val; },

	        get commentLength () { return _commentLength },
	        set commentLength (/*Number*/val) { _commentLength = val; },

	        get mainHeaderSize () {
	            return Constants.ENDHDR + _commentLength;
	        },

	        loadFromBinary : function(/*Buffer*/data) {
	            // data should be 22 bytes and start with "PK 05 06"
	            if (data.length != Constants.ENDHDR || data.readUInt32LE(0) != Constants.ENDSIG)
	                throw Utils.Errors.INVALID_END;

	            // number of entries on this volume
	            _volumeEntries = data.readUInt16LE(Constants.ENDSUB);
	            // total number of entries
	            _totalEntries = data.readUInt16LE(Constants.ENDTOT);
	            // central directory size in bytes
	            _size = data.readUInt32LE(Constants.ENDSIZ);
	            // offset of first CEN header
	            _offset = data.readUInt32LE(Constants.ENDOFF);
	            // zip file comment length
	            _commentLength = data.readUInt16LE(Constants.ENDCOM);
	        },

	        toBinary : function() {
	           var b = new Buffer(Constants.ENDHDR + _commentLength);
	            // "PK 05 06" signature
	            b.writeUInt32LE(Constants.ENDSIG, 0);
	            b.writeUInt32LE(0, 4);
	            // number of entries on this volume
	            b.writeUInt16LE(_volumeEntries, Constants.ENDSUB);
	            // total number of entries
	            b.writeUInt16LE(_totalEntries, Constants.ENDTOT);
	            // central directory size in bytes
	            b.writeUInt32LE(_size, Constants.ENDSIZ);
	            // offset of first CEN header
	            b.writeUInt32LE(_offset, Constants.ENDOFF);
	            // zip file comment length
	            b.writeUInt16LE(_commentLength, Constants.ENDCOM);
	            // fill comment memory with spaces so no garbage is left there
	            b.fill(" ", Constants.ENDHDR);

	            return b;
	        },

	        toString : function() {
	            return '{\n' +
	                '\t"diskEntries" : ' + _volumeEntries + ",\n" +
	                '\t"totalEntries" : ' + _totalEntries + ",\n" +
	                '\t"size" : ' + _size + " bytes,\n" +
	                '\t"offset" : 0x' + _offset.toString(16).toUpperCase() + ",\n" +
	                '\t"commentLength" : 0x' + _commentLength + "\n" +
	            '}';
	        }
	    }
	};

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	exports.Deflater = __webpack_require__(18);
	exports.Inflater = __webpack_require__(20);

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	/*
	 * $Id: rawdeflate.js,v 0.5 2013/04/09 14:25:38 dankogai Exp dankogai $
	 *
	 * GNU General Public License, version 2 (GPL-2.0)
	 *   http://opensource.org/licenses/GPL-2.0
	 * Original:
	 *  http://www.onicos.com/staff/iz/amuse/javascript/expert/deflate.txt
	 */
	function JSDeflater(/*inbuff*/inbuf) {

	    /* Copyright (C) 1999 Masanao Izumo <iz@onicos.co.jp>
	     * Version: 1.0.1
	     * LastModified: Dec 25 1999
	     */

	    var WSIZE = 32768,		// Sliding Window size
	        zip_STORED_BLOCK = 0,
	        zip_STATIC_TREES = 1,
	        zip_DYN_TREES = 2,
	        zip_DEFAULT_LEVEL = 6,
	        zip_FULL_SEARCH = true,
	        zip_INBUFSIZ = 32768,	// Input buffer size
	        zip_INBUF_EXTRA = 64,	// Extra buffer
	        zip_OUTBUFSIZ = 1024 * 8,
	        zip_window_size = 2 * WSIZE,
	        MIN_MATCH = 3,
	        MAX_MATCH = 258,
	        zip_BITS = 16,
	        LIT_BUFSIZE = 0x2000,
	        zip_HASH_BITS = 13,
	        zip_DIST_BUFSIZE = LIT_BUFSIZE,
	        zip_HASH_SIZE = 1 << zip_HASH_BITS,
	        zip_HASH_MASK = zip_HASH_SIZE - 1,
	        zip_WMASK = WSIZE - 1,
	        zip_NIL = 0, // Tail of hash chains
	        zip_TOO_FAR = 4096,
	        zip_MIN_LOOKAHEAD = MAX_MATCH + MIN_MATCH + 1,
	        zip_MAX_DIST = WSIZE - zip_MIN_LOOKAHEAD,
	        zip_SMALLEST = 1,
	        zip_MAX_BITS = 15,
	        zip_MAX_BL_BITS = 7,
	        zip_LENGTH_CODES = 29,
	        zip_LITERALS = 256,
	        zip_END_BLOCK = 256,
	        zip_L_CODES = zip_LITERALS + 1 + zip_LENGTH_CODES,
	        zip_D_CODES = 30,
	        zip_BL_CODES = 19,
	        zip_REP_3_6 = 16,
	        zip_REPZ_3_10 = 17,
	        zip_REPZ_11_138 = 18,
	        zip_HEAP_SIZE = 2 * zip_L_CODES + 1,
	        zip_H_SHIFT = parseInt((zip_HASH_BITS + MIN_MATCH - 1) / MIN_MATCH);

	    var zip_free_queue, zip_qhead, zip_qtail, zip_initflag, zip_outbuf = null, zip_outcnt, zip_outoff, zip_complete,
	        zip_window, zip_d_buf, zip_l_buf, zip_prev, zip_bi_buf, zip_bi_valid, zip_block_start, zip_ins_h, zip_hash_head,
	        zip_prev_match, zip_match_available, zip_match_length, zip_prev_length, zip_strstart, zip_match_start, zip_eofile,
	        zip_lookahead, zip_max_chain_length, zip_max_lazy_match, zip_compr_level, zip_good_match, zip_nice_match,
	        zip_dyn_ltree, zip_dyn_dtree, zip_static_ltree, zip_static_dtree, zip_bl_tree, zip_l_desc, zip_d_desc, zip_bl_desc,
	        zip_bl_count, zip_heap, zip_heap_len, zip_heap_max, zip_depth, zip_length_code, zip_dist_code, zip_base_length,
	        zip_base_dist, zip_flag_buf, zip_last_lit, zip_last_dist, zip_last_flags, zip_flags, zip_flag_bit, zip_opt_len,
	        zip_static_len, zip_deflate_data, zip_deflate_pos;

	    var zip_DeflateCT = function () {
	        this.fc = 0; // frequency count or bit string
	        this.dl = 0; // father node in Huffman tree or length of bit string
	    };

	    var zip_DeflateTreeDesc = function () {
	        this.dyn_tree = null;	// the dynamic tree
	        this.static_tree = null;	// corresponding static tree or NULL
	        this.extra_bits = null;	// extra bits for each code or NULL
	        this.extra_base = 0;	// base index for extra_bits
	        this.elems = 0;		// max number of elements in the tree
	        this.max_length = 0;	// max bit length for the codes
	        this.max_code = 0;		// largest code with non zero frequency
	    };

	    /* Values for max_lazy_match, good_match and max_chain_length, depending on
	     * the desired pack level (0..9). The values given below have been tuned to
	     * exclude worst case performance for pathological files. Better values may be
	     * found for specific files.
	     */
	    var zip_DeflateConfiguration = function (a, b, c, d) {
	        this.good_length = a; // reduce lazy search above this match length
	        this.max_lazy = b;    // do not perform lazy search above this match length
	        this.nice_length = c; // quit search above this match length
	        this.max_chain = d;
	    };

	    var zip_DeflateBuffer = function () {
	        this.next = null;
	        this.len = 0;
	        this.ptr = new Array(zip_OUTBUFSIZ);
	        this.off = 0;
	    };

	    /* constant tables */
	    var zip_extra_lbits = new Array(
	        0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0);
	    var zip_extra_dbits = new Array(
	        0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13);
	    var zip_extra_blbits = new Array(
	        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7);
	    var zip_bl_order = new Array(
	        16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15);
	    var zip_configuration_table = new Array(
	        new zip_DeflateConfiguration(0, 0, 0, 0),
	        new zip_DeflateConfiguration(4, 4, 8, 4),
	        new zip_DeflateConfiguration(4, 5, 16, 8),
	        new zip_DeflateConfiguration(4, 6, 32, 32),
	        new zip_DeflateConfiguration(4, 4, 16, 16),
	        new zip_DeflateConfiguration(8, 16, 32, 32),
	        new zip_DeflateConfiguration(8, 16, 128, 128),
	        new zip_DeflateConfiguration(8, 32, 128, 256),
	        new zip_DeflateConfiguration(32, 128, 258, 1024),
	        new zip_DeflateConfiguration(32, 258, 258, 4096));


	    /* routines (deflate) */

	    var zip_deflate_start = function (level) {
	        var i;

	        if (!level)
	            level = zip_DEFAULT_LEVEL;
	        else if (level < 1)
	            level = 1;
	        else if (level > 9)
	            level = 9;

	        zip_compr_level = level;
	        zip_initflag = false;
	        zip_eofile = false;
	        if (zip_outbuf != null)
	            return;

	        zip_free_queue = zip_qhead = zip_qtail = null;
	        zip_outbuf = new Array(zip_OUTBUFSIZ);
	        zip_window = new Array(zip_window_size);
	        zip_d_buf = new Array(zip_DIST_BUFSIZE);
	        zip_l_buf = new Array(zip_INBUFSIZ + zip_INBUF_EXTRA);
	        zip_prev = new Array(1 << zip_BITS);
	        zip_dyn_ltree = new Array(zip_HEAP_SIZE);
	        for (i = 0; i < zip_HEAP_SIZE; i++) zip_dyn_ltree[i] = new zip_DeflateCT();
	        zip_dyn_dtree = new Array(2 * zip_D_CODES + 1);
	        for (i = 0; i < 2 * zip_D_CODES + 1; i++) zip_dyn_dtree[i] = new zip_DeflateCT();
	        zip_static_ltree = new Array(zip_L_CODES + 2);
	        for (i = 0; i < zip_L_CODES + 2; i++) zip_static_ltree[i] = new zip_DeflateCT();
	        zip_static_dtree = new Array(zip_D_CODES);
	        for (i = 0; i < zip_D_CODES; i++) zip_static_dtree[i] = new zip_DeflateCT();
	        zip_bl_tree = new Array(2 * zip_BL_CODES + 1);
	        for (i = 0; i < 2 * zip_BL_CODES + 1; i++) zip_bl_tree[i] = new zip_DeflateCT();
	        zip_l_desc = new zip_DeflateTreeDesc();
	        zip_d_desc = new zip_DeflateTreeDesc();
	        zip_bl_desc = new zip_DeflateTreeDesc();
	        zip_bl_count = new Array(zip_MAX_BITS + 1);
	        zip_heap = new Array(2 * zip_L_CODES + 1);
	        zip_depth = new Array(2 * zip_L_CODES + 1);
	        zip_length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
	        zip_dist_code = new Array(512);
	        zip_base_length = new Array(zip_LENGTH_CODES);
	        zip_base_dist = new Array(zip_D_CODES);
	        zip_flag_buf = new Array(parseInt(LIT_BUFSIZE / 8));
	    };

	    var zip_deflate_end = function () {
	        zip_free_queue = zip_qhead = zip_qtail = null;
	        zip_outbuf = null;
	        zip_window = null;
	        zip_d_buf = null;
	        zip_l_buf = null;
	        zip_prev = null;
	        zip_dyn_ltree = null;
	        zip_dyn_dtree = null;
	        zip_static_ltree = null;
	        zip_static_dtree = null;
	        zip_bl_tree = null;
	        zip_l_desc = null;
	        zip_d_desc = null;
	        zip_bl_desc = null;
	        zip_bl_count = null;
	        zip_heap = null;
	        zip_depth = null;
	        zip_length_code = null;
	        zip_dist_code = null;
	        zip_base_length = null;
	        zip_base_dist = null;
	        zip_flag_buf = null;
	    };

	    var zip_reuse_queue = function (p) {
	        p.next = zip_free_queue;
	        zip_free_queue = p;
	    };

	    var zip_new_queue = function () {
	        var p;

	        if (zip_free_queue != null) {
	            p = zip_free_queue;
	            zip_free_queue = zip_free_queue.next;
	        }
	        else
	            p = new zip_DeflateBuffer();
	        p.next = null;
	        p.len = p.off = 0;

	        return p;
	    };

	    var zip_head1 = function (i) {
	        return zip_prev[WSIZE + i];
	    };

	    var zip_head2 = function (i, val) {
	        return zip_prev[WSIZE + i] = val;
	    };

	    /* put_byte is used for the compressed output, put_ubyte for the
	     * uncompressed output. However unlzw() uses window for its
	     * suffix table instead of its output buffer, so it does not use put_ubyte
	     * (to be cleaned up).
	     */
	    var zip_put_byte = function (c) {
	        zip_outbuf[zip_outoff + zip_outcnt++] = c;
	        if (zip_outoff + zip_outcnt == zip_OUTBUFSIZ)
	            zip_qoutbuf();
	    };

	    /* Output a 16 bit value, lsb first */
	    var zip_put_short = function (w) {
	        w &= 0xffff;
	        if (zip_outoff + zip_outcnt < zip_OUTBUFSIZ - 2) {
	            zip_outbuf[zip_outoff + zip_outcnt++] = (w & 0xff);
	            zip_outbuf[zip_outoff + zip_outcnt++] = (w >>> 8);
	        } else {
	            zip_put_byte(w & 0xff);
	            zip_put_byte(w >>> 8);
	        }
	    };

	    /* ==========================================================================
	     * Insert string s in the dictionary and set match_head to the previous head
	     * of the hash chain (the most recent string with same hash key). Return
	     * the previous length of the hash chain.
	     * IN  assertion: all calls to to INSERT_STRING are made with consecutive
	     *    input characters and the first MIN_MATCH bytes of s are valid
	     *    (except for the last MIN_MATCH-1 bytes of the input file).
	     */
	    var zip_INSERT_STRING = function () {
	        zip_ins_h = ((zip_ins_h << zip_H_SHIFT)
	            ^ (zip_window[zip_strstart + MIN_MATCH - 1] & 0xff))
	            & zip_HASH_MASK;
	        zip_hash_head = zip_head1(zip_ins_h);
	        zip_prev[zip_strstart & zip_WMASK] = zip_hash_head;
	        zip_head2(zip_ins_h, zip_strstart);
	    };

	    /* Send a code of the given tree. c and tree must not have side effects */
	    var zip_SEND_CODE = function (c, tree) {
	        zip_send_bits(tree[c].fc, tree[c].dl);
	    };

	    /* Mapping from a distance to a distance code. dist is the distance - 1 and
	     * must not have side effects. dist_code[256] and dist_code[257] are never
	     * used.
	     */
	    var zip_D_CODE = function (dist) {
	        return (dist < 256 ? zip_dist_code[dist]
	            : zip_dist_code[256 + (dist >> 7)]) & 0xff;
	    };

	    /* ==========================================================================
	     * Compares to subtrees, using the tree depth as tie breaker when
	     * the subtrees have equal frequency. This minimizes the worst case length.
	     */
	    var zip_SMALLER = function (tree, n, m) {
	        return tree[n].fc < tree[m].fc ||
	            (tree[n].fc == tree[m].fc && zip_depth[n] <= zip_depth[m]);
	    };

	    /* ==========================================================================
	     * read string data
	     */
	    var zip_read_buff = function (buff, offset, n) {
	        var i;
	        for (i = 0; i < n && zip_deflate_pos < zip_deflate_data.length; i++)
	            buff[offset + i] =
	                zip_deflate_data[zip_deflate_pos++] & 0xff;
	        return i;
	    };

	    /* ==========================================================================
	     * Initialize the "longest match" routines for a new file
	     */
	    var zip_lm_init = function () {
	        var j;

	        /* Initialize the hash table. */
	        for (j = 0; j < zip_HASH_SIZE; j++)
	            zip_prev[WSIZE + j] = 0;
	        zip_max_lazy_match = zip_configuration_table[zip_compr_level].max_lazy;
	        zip_good_match = zip_configuration_table[zip_compr_level].good_length;
	        if (!zip_FULL_SEARCH)
	            zip_nice_match = zip_configuration_table[zip_compr_level].nice_length;
	        zip_max_chain_length = zip_configuration_table[zip_compr_level].max_chain;

	        zip_strstart = 0;
	        zip_block_start = 0;

	        zip_lookahead = zip_read_buff(zip_window, 0, 2 * WSIZE);
	        if (zip_lookahead <= 0) {
	            zip_eofile = true;
	            zip_lookahead = 0;
	            return;
	        }
	        zip_eofile = false;
	        /* Make sure that we always have enough lookahead. This is important
	         * if input comes from a device such as a tty.
	         */
	        while (zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
	            zip_fill_window();

	        /* If lookahead < MIN_MATCH, ins_h is garbage, but this is
	         * not important since only literal bytes will be emitted.
	         */
	        zip_ins_h = 0;
	        for (j = 0; j < MIN_MATCH - 1; j++) {
	            zip_ins_h = ((zip_ins_h << zip_H_SHIFT) ^ (zip_window[j] & 0xff)) & zip_HASH_MASK;
	        }
	    };

	    /* ==========================================================================
	     * Set match_start to the longest match starting at the given string and
	     * return its length. Matches shorter or equal to prev_length are discarded,
	     * in which case the result is equal to prev_length and match_start is
	     * garbage.
	     * IN assertions: cur_match is the head of the hash chain for the current
	     *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
	     */
	    var zip_longest_match = function (cur_match) {
	        var chain_length = zip_max_chain_length; // max hash chain length
	        var scanp = zip_strstart; // current string
	        var matchp;		// matched string
	        var len;		// length of current match
	        var best_len = zip_prev_length;	// best match length so far

	        /* Stop when cur_match becomes <= limit. To simplify the code,
	         * we prevent matches with the string of window index 0.
	         */
	        var limit = (zip_strstart > zip_MAX_DIST ? zip_strstart - zip_MAX_DIST : zip_NIL);

	        var strendp = zip_strstart + MAX_MATCH;
	        var scan_end1 = zip_window[scanp + best_len - 1];
	        var scan_end = zip_window[scanp + best_len];

	        /* Do not waste too much time if we already have a good match: */
	        if (zip_prev_length >= zip_good_match)
	            chain_length >>= 2;

	        do {
	            matchp = cur_match;

	            /* Skip to next match if the match length cannot increase
	             * or if the match length is less than 2:
	             */
	            if (zip_window[matchp + best_len] != scan_end ||
	                zip_window[matchp + best_len - 1] != scan_end1 ||
	                zip_window[matchp] != zip_window[scanp] ||
	                zip_window[++matchp] != zip_window[scanp + 1]) {
	                continue;
	            }

	            /* The check at best_len-1 can be removed because it will be made
	             * again later. (This heuristic is not always a win.)
	             * It is not necessary to compare scan[2] and match[2] since they
	             * are always equal when the other bytes match, given that
	             * the hash keys are equal and that HASH_BITS >= 8.
	             */
	            scanp += 2;
	            matchp++;

	            /* We check for insufficient lookahead only every 8th comparison;
	             * the 256th check will be made at strstart+258.
	             */
	            do {
	            } while (zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                zip_window[++scanp] == zip_window[++matchp] &&
	                scanp < strendp);

	            len = MAX_MATCH - (strendp - scanp);
	            scanp = strendp - MAX_MATCH;

	            if (len > best_len) {
	                zip_match_start = cur_match;
	                best_len = len;
	                if (zip_FULL_SEARCH) {
	                    if (len >= MAX_MATCH) break;
	                } else {
	                    if (len >= zip_nice_match) break;
	                }

	                scan_end1 = zip_window[scanp + best_len - 1];
	                scan_end = zip_window[scanp + best_len];
	            }
	        } while ((cur_match = zip_prev[cur_match & zip_WMASK]) > limit
	            && --chain_length != 0);

	        return best_len;
	    };

	    /* ==========================================================================
	     * Fill the window when the lookahead becomes insufficient.
	     * Updates strstart and lookahead, and sets eofile if end of input file.
	     * IN assertion: lookahead < MIN_LOOKAHEAD && strstart + lookahead > 0
	     * OUT assertions: at least one byte has been read, or eofile is set;
	     *    file reads are performed for at least two bytes (required for the
	     *    translate_eol option).
	     */
	    var zip_fill_window = function () {
	        var n, m;

	        // Amount of free space at the end of the window.
	        var more = zip_window_size - zip_lookahead - zip_strstart;

	        /* If the window is almost full and there is insufficient lookahead,
	         * move the upper half to the lower one to make room in the upper half.
	         */
	        if (more == -1) {
	            /* Very unlikely, but possible on 16 bit machine if strstart == 0
	             * and lookahead == 1 (input done one byte at time)
	             */
	            more--;
	        } else if (zip_strstart >= WSIZE + zip_MAX_DIST) {
	            /* By the IN assertion, the window is not empty so we can't confuse
	             * more == 0 with more == 64K on a 16 bit machine.
	             */
	            for (n = 0; n < WSIZE; n++)
	                zip_window[n] = zip_window[n + WSIZE];

	            zip_match_start -= WSIZE;
	            zip_strstart -= WSIZE;
	            /* we now have strstart >= MAX_DIST: */
	            zip_block_start -= WSIZE;

	            for (n = 0; n < zip_HASH_SIZE; n++) {
	                m = zip_head1(n);
	                zip_head2(n, m >= WSIZE ? m - WSIZE : zip_NIL);
	            }
	            for (n = 0; n < WSIZE; n++) {
	                /* If n is not on any hash chain, prev[n] is garbage but
	                 * its value will never be used.
	                 */
	                m = zip_prev[n];
	                zip_prev[n] = (m >= WSIZE ? m - WSIZE : zip_NIL);
	            }
	            more += WSIZE;
	        }
	        // At this point, more >= 2
	        if (!zip_eofile) {
	            n = zip_read_buff(zip_window, zip_strstart + zip_lookahead, more);
	            if (n <= 0)
	                zip_eofile = true;
	            else
	                zip_lookahead += n;
	        }
	    };

	    /* ==========================================================================
	     * Processes a new input file and return its compressed length. This
	     * function does not perform lazy evaluationof matches and inserts
	     * new strings in the dictionary only for unmatched strings or for short
	     * matches. It is used only for the fast compression options.
	     */
	    var zip_deflate_fast = function () {
	        while (zip_lookahead != 0 && zip_qhead == null) {
	            var flush; // set if current block must be flushed

	            /* Insert the string window[strstart .. strstart+2] in the
	             * dictionary, and set hash_head to the head of the hash chain:
	             */
	            zip_INSERT_STRING();

	            /* Find the longest match, discarding those <= prev_length.
	             * At this point we have always match_length < MIN_MATCH
	             */
	            if (zip_hash_head != zip_NIL &&
	                zip_strstart - zip_hash_head <= zip_MAX_DIST) {
	                /* To simplify the code, we prevent matches with the string
	                 * of window index 0 (in particular we have to avoid a match
	                 * of the string with itself at the start of the input file).
	                 */
	                zip_match_length = zip_longest_match(zip_hash_head);
	                /* longest_match() sets match_start */
	                if (zip_match_length > zip_lookahead)
	                    zip_match_length = zip_lookahead;
	            }
	            if (zip_match_length >= MIN_MATCH) {
	                flush = zip_ct_tally(zip_strstart - zip_match_start,
	                    zip_match_length - MIN_MATCH);
	                zip_lookahead -= zip_match_length;

	                /* Insert new strings in the hash table only if the match length
	                 * is not too large. This saves time but degrades compression.
	                 */
	                if (zip_match_length <= zip_max_lazy_match) {
	                    zip_match_length--; // string at strstart already in hash table
	                    do {
	                        zip_strstart++;
	                        zip_INSERT_STRING();
	                        /* strstart never exceeds WSIZE-MAX_MATCH, so there are
	                         * always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
	                         * these bytes are garbage, but it does not matter since
	                         * the next lookahead bytes will be emitted as literals.
	                         */
	                    } while (--zip_match_length != 0);
	                    zip_strstart++;
	                } else {
	                    zip_strstart += zip_match_length;
	                    zip_match_length = 0;
	                    zip_ins_h = zip_window[zip_strstart] & 0xff;
	                    zip_ins_h = ((zip_ins_h << zip_H_SHIFT) ^ (zip_window[zip_strstart + 1] & 0xff)) & zip_HASH_MASK;
	                }
	            } else {
	                /* No match, output a literal byte */
	                flush = zip_ct_tally(0, zip_window[zip_strstart] & 0xff);
	                zip_lookahead--;
	                zip_strstart++;
	            }
	            if (flush) {
	                zip_flush_block(0);
	                zip_block_start = zip_strstart;
	            }

	            /* Make sure that we always have enough lookahead, except
	             * at the end of the input file. We need MAX_MATCH bytes
	             * for the next match, plus MIN_MATCH bytes to insert the
	             * string following the next match.
	             */
	            while (zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
	                zip_fill_window();
	        }
	    };

	    var zip_deflate_better = function () {
	        /* Process the input block. */
	        while (zip_lookahead != 0 && zip_qhead == null) {
	            /* Insert the string window[strstart .. strstart+2] in the
	             * dictionary, and set hash_head to the head of the hash chain:
	             */
	            zip_INSERT_STRING();

	            /* Find the longest match, discarding those <= prev_length.
	             */
	            zip_prev_length = zip_match_length;
	            zip_prev_match = zip_match_start;
	            zip_match_length = MIN_MATCH - 1;

	            if (zip_hash_head != zip_NIL &&
	                zip_prev_length < zip_max_lazy_match &&
	                zip_strstart - zip_hash_head <= zip_MAX_DIST) {
	                /* To simplify the code, we prevent matches with the string
	                 * of window index 0 (in particular we have to avoid a match
	                 * of the string with itself at the start of the input file).
	                 */
	                zip_match_length = zip_longest_match(zip_hash_head);
	                /* longest_match() sets match_start */
	                if (zip_match_length > zip_lookahead)
	                    zip_match_length = zip_lookahead;

	                /* Ignore a length 3 match if it is too distant: */
	                if (zip_match_length == MIN_MATCH &&
	                    zip_strstart - zip_match_start > zip_TOO_FAR) {
	                    /* If prev_match is also MIN_MATCH, match_start is garbage
	                     * but we will ignore the current match anyway.
	                     */
	                    zip_match_length--;
	                }
	            }
	            /* If there was a match at the previous step and the current
	             * match is not better, output the previous match:
	             */
	            if (zip_prev_length >= MIN_MATCH &&
	                zip_match_length <= zip_prev_length) {
	                var flush; // set if current block must be flushed
	                flush = zip_ct_tally(zip_strstart - 1 - zip_prev_match,
	                    zip_prev_length - MIN_MATCH);

	                /* Insert in hash table all strings up to the end of the match.
	                 * strstart-1 and strstart are already inserted.
	                 */
	                zip_lookahead -= zip_prev_length - 1;
	                zip_prev_length -= 2;
	                do {
	                    zip_strstart++;
	                    zip_INSERT_STRING();
	                    /* strstart never exceeds WSIZE-MAX_MATCH, so there are
	                     * always MIN_MATCH bytes ahead. If lookahead < MIN_MATCH
	                     * these bytes are garbage, but it does not matter since the
	                     * next lookahead bytes will always be emitted as literals.
	                     */
	                } while (--zip_prev_length != 0);
	                zip_match_available = 0;
	                zip_match_length = MIN_MATCH - 1;
	                zip_strstart++;
	                if (flush) {
	                    zip_flush_block(0);
	                    zip_block_start = zip_strstart;
	                }
	            } else if (zip_match_available != 0) {
	                /* If there was no match at the previous position, output a
	                 * single literal. If there was a match but the current match
	                 * is longer, truncate the previous match to a single literal.
	                 */
	                if (zip_ct_tally(0, zip_window[zip_strstart - 1] & 0xff)) {
	                    zip_flush_block(0);
	                    zip_block_start = zip_strstart;
	                }
	                zip_strstart++;
	                zip_lookahead--;
	            } else {
	                /* There is no previous match to compare with, wait for
	                 * the next step to decide.
	                 */
	                zip_match_available = 1;
	                zip_strstart++;
	                zip_lookahead--;
	            }

	            /* Make sure that we always have enough lookahead, except
	             * at the end of the input file. We need MAX_MATCH bytes
	             * for the next match, plus MIN_MATCH bytes to insert the
	             * string following the next match.
	             */
	            while (zip_lookahead < zip_MIN_LOOKAHEAD && !zip_eofile)
	                zip_fill_window();
	        }
	    };

	    var zip_init_deflate = function () {
	        if (zip_eofile)
	            return;
	        zip_bi_buf = 0;
	        zip_bi_valid = 0;
	        zip_ct_init();
	        zip_lm_init();

	        zip_qhead = null;
	        zip_outcnt = 0;
	        zip_outoff = 0;
	        zip_match_available = 0;

	        if (zip_compr_level <= 3) {
	            zip_prev_length = MIN_MATCH - 1;
	            zip_match_length = 0;
	        }
	        else {
	            zip_match_length = MIN_MATCH - 1;
	            zip_match_available = 0;
	            zip_match_available = 0;
	        }

	        zip_complete = false;
	    };

	    /* ==========================================================================
	     * Same as above, but achieves better compression. We use a lazy
	     * evaluation for matches: a match is finally adopted only if there is
	     * no better match at the next window position.
	     */
	    var zip_deflate_internal = function (buff, off, buff_size) {
	        var n;

	        if (!zip_initflag) {
	            zip_init_deflate();
	            zip_initflag = true;
	            if (zip_lookahead == 0) { // empty
	                zip_complete = true;
	                return 0;
	            }
	        }

	        if ((n = zip_qcopy(buff, off, buff_size)) == buff_size)
	            return buff_size;

	        if (zip_complete)
	            return n;

	        if (zip_compr_level <= 3) // optimized for speed
	            zip_deflate_fast();
	        else
	            zip_deflate_better();
	        if (zip_lookahead == 0) {
	            if (zip_match_available != 0)
	                zip_ct_tally(0, zip_window[zip_strstart - 1] & 0xff);
	            zip_flush_block(1);
	            zip_complete = true;
	        }
	        return n + zip_qcopy(buff, n + off, buff_size - n);
	    };

	    var zip_qcopy = function (buff, off, buff_size) {
	        var n, i, j;

	        n = 0;
	        while (zip_qhead != null && n < buff_size) {
	            i = buff_size - n;
	            if (i > zip_qhead.len)
	                i = zip_qhead.len;
	            for (j = 0; j < i; j++)
	                buff[off + n + j] = zip_qhead.ptr[zip_qhead.off + j];

	            zip_qhead.off += i;
	            zip_qhead.len -= i;
	            n += i;
	            if (zip_qhead.len == 0) {
	                var p;
	                p = zip_qhead;
	                zip_qhead = zip_qhead.next;
	                zip_reuse_queue(p);
	            }
	        }

	        if (n == buff_size)
	            return n;

	        if (zip_outoff < zip_outcnt) {
	            i = buff_size - n;
	            if (i > zip_outcnt - zip_outoff)
	                i = zip_outcnt - zip_outoff;
	            // System.arraycopy(outbuf, outoff, buff, off + n, i);
	            for (j = 0; j < i; j++)
	                buff[off + n + j] = zip_outbuf[zip_outoff + j];
	            zip_outoff += i;
	            n += i;
	            if (zip_outcnt == zip_outoff)
	                zip_outcnt = zip_outoff = 0;
	        }
	        return n;
	    };

	    /* ==========================================================================
	     * Allocate the match buffer, initialize the various tables and save the
	     * location of the internal file attribute (ascii/binary) and method
	     * (DEFLATE/STORE).
	     */
	    var zip_ct_init = function () {
	        var n;	// iterates over tree elements
	        var bits;	// bit counter
	        var length;	// length value
	        var code;	// code value
	        var dist;	// distance index

	        if (zip_static_dtree[0].dl != 0) return; // ct_init already called

	        zip_l_desc.dyn_tree = zip_dyn_ltree;
	        zip_l_desc.static_tree = zip_static_ltree;
	        zip_l_desc.extra_bits = zip_extra_lbits;
	        zip_l_desc.extra_base = zip_LITERALS + 1;
	        zip_l_desc.elems = zip_L_CODES;
	        zip_l_desc.max_length = zip_MAX_BITS;
	        zip_l_desc.max_code = 0;

	        zip_d_desc.dyn_tree = zip_dyn_dtree;
	        zip_d_desc.static_tree = zip_static_dtree;
	        zip_d_desc.extra_bits = zip_extra_dbits;
	        zip_d_desc.extra_base = 0;
	        zip_d_desc.elems = zip_D_CODES;
	        zip_d_desc.max_length = zip_MAX_BITS;
	        zip_d_desc.max_code = 0;

	        zip_bl_desc.dyn_tree = zip_bl_tree;
	        zip_bl_desc.static_tree = null;
	        zip_bl_desc.extra_bits = zip_extra_blbits;
	        zip_bl_desc.extra_base = 0;
	        zip_bl_desc.elems = zip_BL_CODES;
	        zip_bl_desc.max_length = zip_MAX_BL_BITS;
	        zip_bl_desc.max_code = 0;

	        // Initialize the mapping length (0..255) -> length code (0..28)
	        length = 0;
	        for (code = 0; code < zip_LENGTH_CODES - 1; code++) {
	            zip_base_length[code] = length;
	            for (n = 0; n < (1 << zip_extra_lbits[code]); n++)
	                zip_length_code[length++] = code;
	        }
	        /* Note that the length 255 (match length 258) can be represented
	         * in two different ways: code 284 + 5 bits or code 285, so we
	         * overwrite length_code[255] to use the best encoding:
	         */
	        zip_length_code[length - 1] = code;

	        /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
	        dist = 0;
	        for (code = 0; code < 16; code++) {
	            zip_base_dist[code] = dist;
	            for (n = 0; n < (1 << zip_extra_dbits[code]); n++) {
	                zip_dist_code[dist++] = code;
	            }
	        }
	        dist >>= 7; // from now on, all distances are divided by 128
	        for (; code < zip_D_CODES; code++) {
	            zip_base_dist[code] = dist << 7;
	            for (n = 0; n < (1 << (zip_extra_dbits[code] - 7)); n++)
	                zip_dist_code[256 + dist++] = code;
	        }
	        // Construct the codes of the static literal tree
	        for (bits = 0; bits <= zip_MAX_BITS; bits++)
	            zip_bl_count[bits] = 0;
	        n = 0;
	        while (n <= 143) {
	            zip_static_ltree[n++].dl = 8;
	            zip_bl_count[8]++;
	        }
	        while (n <= 255) {
	            zip_static_ltree[n++].dl = 9;
	            zip_bl_count[9]++;
	        }
	        while (n <= 279) {
	            zip_static_ltree[n++].dl = 7;
	            zip_bl_count[7]++;
	        }
	        while (n <= 287) {
	            zip_static_ltree[n++].dl = 8;
	            zip_bl_count[8]++;
	        }
	        /* Codes 286 and 287 do not exist, but we must include them in the
	         * tree construction to get a canonical Huffman tree (longest code
	         * all ones)
	         */
	        zip_gen_codes(zip_static_ltree, zip_L_CODES + 1);

	        /* The static distance tree is trivial: */
	        for (n = 0; n < zip_D_CODES; n++) {
	            zip_static_dtree[n].dl = 5;
	            zip_static_dtree[n].fc = zip_bi_reverse(n, 5);
	        }

	        // Initialize the first block of the first file:
	        zip_init_block();
	    };

	    /* ==========================================================================
	     * Initialize a new block.
	     */
	    var zip_init_block = function () {
	        var n; // iterates over tree elements

	        // Initialize the trees.
	        for (n = 0; n < zip_L_CODES; n++) zip_dyn_ltree[n].fc = 0;
	        for (n = 0; n < zip_D_CODES; n++) zip_dyn_dtree[n].fc = 0;
	        for (n = 0; n < zip_BL_CODES; n++) zip_bl_tree[n].fc = 0;

	        zip_dyn_ltree[zip_END_BLOCK].fc = 1;
	        zip_opt_len = zip_static_len = 0;
	        zip_last_lit = zip_last_dist = zip_last_flags = 0;
	        zip_flags = 0;
	        zip_flag_bit = 1;
	    };

	    /* ==========================================================================
	     * Restore the heap property by moving down the tree starting at node k,
	     * exchanging a node with the smallest of its two sons if necessary, stopping
	     * when the heap property is re-established (each father smaller than its
	     * two sons).
	     */
	    var zip_pqdownheap = function (tree,	// the tree to restore
	                                   k) {	// node to move down
	        var v = zip_heap[k];
	        var j = k << 1;	// left son of k

	        while (j <= zip_heap_len) {
	            // Set j to the smallest of the two sons:
	            if (j < zip_heap_len &&
	                zip_SMALLER(tree, zip_heap[j + 1], zip_heap[j]))
	                j++;

	            // Exit if v is smaller than both sons
	            if (zip_SMALLER(tree, v, zip_heap[j]))
	                break;

	            // Exchange v with the smallest son
	            zip_heap[k] = zip_heap[j];
	            k = j;

	            // And continue down the tree, setting j to the left son of k
	            j <<= 1;
	        }
	        zip_heap[k] = v;
	    };

	    /* ==========================================================================
	     * Compute the optimal bit lengths for a tree and update the total bit length
	     * for the current block.
	     * IN assertion: the fields freq and dad are set, heap[heap_max] and
	     *    above are the tree nodes sorted by increasing frequency.
	     * OUT assertions: the field len is set to the optimal bit length, the
	     *     array bl_count contains the frequencies for each bit length.
	     *     The length opt_len is updated; static_len is also updated if stree is
	     *     not null.
	     */
	    var zip_gen_bitlen = function (desc) { // the tree descriptor
	        var tree = desc.dyn_tree;
	        var extra = desc.extra_bits;
	        var base = desc.extra_base;
	        var max_code = desc.max_code;
	        var max_length = desc.max_length;
	        var stree = desc.static_tree;
	        var h;		// heap index
	        var n, m;		// iterate over the tree elements
	        var bits;		// bit length
	        var xbits;		// extra bits
	        var f;		// frequency
	        var overflow = 0;	// number of elements with bit length too large

	        for (bits = 0; bits <= zip_MAX_BITS; bits++)
	            zip_bl_count[bits] = 0;

	        /* In a first pass, compute the optimal bit lengths (which may
	         * overflow in the case of the bit length tree).
	         */
	        tree[zip_heap[zip_heap_max]].dl = 0; // root of the heap

	        for (h = zip_heap_max + 1; h < zip_HEAP_SIZE; h++) {
	            n = zip_heap[h];
	            bits = tree[tree[n].dl].dl + 1;
	            if (bits > max_length) {
	                bits = max_length;
	                overflow++;
	            }
	            tree[n].dl = bits;
	            // We overwrite tree[n].dl which is no longer needed

	            if (n > max_code)
	                continue; // not a leaf node

	            zip_bl_count[bits]++;
	            xbits = 0;
	            if (n >= base)
	                xbits = extra[n - base];
	            f = tree[n].fc;
	            zip_opt_len += f * (bits + xbits);
	            if (stree != null)
	                zip_static_len += f * (stree[n].dl + xbits);
	        }
	        if (overflow == 0)
	            return;

	        // This happens for example on obj2 and pic of the Calgary corpus

	        // Find the first bit length which could increase:
	        do {
	            bits = max_length - 1;
	            while (zip_bl_count[bits] == 0)
	                bits--;
	            zip_bl_count[bits]--;		// move one leaf down the tree
	            zip_bl_count[bits + 1] += 2;	// move one overflow item as its brother
	            zip_bl_count[max_length]--;
	            /* The brother of the overflow item also moves one step up,
	             * but this does not affect bl_count[max_length]
	             */
	            overflow -= 2;
	        } while (overflow > 0);

	        /* Now recompute all bit lengths, scanning in increasing frequency.
	         * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
	         * lengths instead of fixing only the wrong ones. This idea is taken
	         * from 'ar' written by Haruhiko Okumura.)
	         */
	        for (bits = max_length; bits != 0; bits--) {
	            n = zip_bl_count[bits];
	            while (n != 0) {
	                m = zip_heap[--h];
	                if (m > max_code)
	                    continue;
	                if (tree[m].dl != bits) {
	                    zip_opt_len += (bits - tree[m].dl) * tree[m].fc;
	                    tree[m].fc = bits;
	                }
	                n--;
	            }
	        }
	    };

	    /* ==========================================================================
	     * Generate the codes for a given tree and bit counts (which need not be
	     * optimal).
	     * IN assertion: the array bl_count contains the bit length statistics for
	     * the given tree and the field len is set for all tree elements.
	     * OUT assertion: the field code is set for all tree elements of non
	     *     zero code length.
	     */
	    var zip_gen_codes = function (tree,	// the tree to decorate
	                                  max_code) {	// largest code with non zero frequency
	        var next_code = new Array(zip_MAX_BITS + 1); // next code value for each bit length
	        var code = 0;		// running code value
	        var bits;			// bit index
	        var n;			// code index

	        /* The distribution counts are first used to generate the code values
	         * without bit reversal.
	         */
	        for (bits = 1; bits <= zip_MAX_BITS; bits++) {
	            code = ((code + zip_bl_count[bits - 1]) << 1);
	            next_code[bits] = code;
	        }

	        /* Check that the bit counts in bl_count are consistent. The last code
	         * must be all ones.
	         */
	        for (n = 0; n <= max_code; n++) {
	            var len = tree[n].dl;
	            if (len == 0)
	                continue;
	            // Now reverse the bits
	            tree[n].fc = zip_bi_reverse(next_code[len]++, len);
	        }
	    };

	    /* ==========================================================================
	     * Construct one Huffman tree and assigns the code bit strings and lengths.
	     * Update the total bit length for the current block.
	     * IN assertion: the field freq is set for all tree elements.
	     * OUT assertions: the fields len and code are set to the optimal bit length
	     *     and corresponding code. The length opt_len is updated; static_len is
	     *     also updated if stree is not null. The field max_code is set.
	     */
	    var zip_build_tree = function (desc) { // the tree descriptor
	        var tree = desc.dyn_tree;
	        var stree = desc.static_tree;
	        var elems = desc.elems;
	        var n, m;		// iterate over heap elements
	        var max_code = -1;	// largest code with non zero frequency
	        var node = elems;	// next internal node of the tree

	        /* Construct the initial heap, with least frequent element in
	         * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
	         * heap[0] is not used.
	         */
	        zip_heap_len = 0;
	        zip_heap_max = zip_HEAP_SIZE;

	        for (n = 0; n < elems; n++) {
	            if (tree[n].fc != 0) {
	                zip_heap[++zip_heap_len] = max_code = n;
	                zip_depth[n] = 0;
	            } else
	                tree[n].dl = 0;
	        }

	        /* The pkzip format requires that at least one distance code exists,
	         * and that at least one bit should be sent even if there is only one
	         * possible code. So to avoid special checks later on we force at least
	         * two codes of non zero frequency.
	         */
	        while (zip_heap_len < 2) {
	            var xnew = zip_heap[++zip_heap_len] = (max_code < 2 ? ++max_code : 0);
	            tree[xnew].fc = 1;
	            zip_depth[xnew] = 0;
	            zip_opt_len--;
	            if (stree != null)
	                zip_static_len -= stree[xnew].dl;
	            // new is 0 or 1 so it does not have extra bits
	        }
	        desc.max_code = max_code;

	        /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
	         * establish sub-heaps of increasing lengths:
	         */
	        for (n = zip_heap_len >> 1; n >= 1; n--)
	            zip_pqdownheap(tree, n);

	        /* Construct the Huffman tree by repeatedly combining the least two
	         * frequent nodes.
	         */
	        do {
	            n = zip_heap[zip_SMALLEST];
	            zip_heap[zip_SMALLEST] = zip_heap[zip_heap_len--];
	            zip_pqdownheap(tree, zip_SMALLEST);

	            m = zip_heap[zip_SMALLEST];  // m = node of next least frequency

	            // keep the nodes sorted by frequency
	            zip_heap[--zip_heap_max] = n;
	            zip_heap[--zip_heap_max] = m;

	            // Create a new node father of n and m
	            tree[node].fc = tree[n].fc + tree[m].fc;
	            if (zip_depth[n] > zip_depth[m] + 1)
	                zip_depth[node] = zip_depth[n];
	            else
	                zip_depth[node] = zip_depth[m] + 1;
	            tree[n].dl = tree[m].dl = node;

	            // and insert the new node in the heap
	            zip_heap[zip_SMALLEST] = node++;
	            zip_pqdownheap(tree, zip_SMALLEST);

	        } while (zip_heap_len >= 2);

	        zip_heap[--zip_heap_max] = zip_heap[zip_SMALLEST];

	        /* At this point, the fields freq and dad are set. We can now
	         * generate the bit lengths.
	         */
	        zip_gen_bitlen(desc);

	        // The field len is now set, we can generate the bit codes
	        zip_gen_codes(tree, max_code);
	    };

	    /* ==========================================================================
	     * Scan a literal or distance tree to determine the frequencies of the codes
	     * in the bit length tree. Updates opt_len to take into account the repeat
	     * counts. (The contribution of the bit length codes will be added later
	     * during the construction of bl_tree.)
	     */
	    var zip_scan_tree = function (tree,// the tree to be scanned
	                                  max_code) {  // and its largest code of non zero frequency
	        var n;			// iterates over all tree elements
	        var prevlen = -1;		// last emitted length
	        var curlen;			// length of current code
	        var nextlen = tree[0].dl;	// length of next code
	        var count = 0;		// repeat count of the current code
	        var max_count = 7;		// max repeat count
	        var min_count = 4;		// min repeat count

	        if (nextlen == 0) {
	            max_count = 138;
	            min_count = 3;
	        }
	        tree[max_code + 1].dl = 0xffff; // guard

	        for (n = 0; n <= max_code; n++) {
	            curlen = nextlen;
	            nextlen = tree[n + 1].dl;
	            if (++count < max_count && curlen == nextlen)
	                continue;
	            else if (count < min_count)
	                zip_bl_tree[curlen].fc += count;
	            else if (curlen != 0) {
	                if (curlen != prevlen)
	                    zip_bl_tree[curlen].fc++;
	                zip_bl_tree[zip_REP_3_6].fc++;
	            } else if (count <= 10)
	                zip_bl_tree[zip_REPZ_3_10].fc++;
	            else
	                zip_bl_tree[zip_REPZ_11_138].fc++;
	            count = 0;
	            prevlen = curlen;
	            if (nextlen == 0) {
	                max_count = 138;
	                min_count = 3;
	            } else if (curlen == nextlen) {
	                max_count = 6;
	                min_count = 3;
	            } else {
	                max_count = 7;
	                min_count = 4;
	            }
	        }
	    };

	    /* ==========================================================================
	     * Send a literal or distance tree in compressed form, using the codes in
	     * bl_tree.
	     */
	    var zip_send_tree = function (tree, // the tree to be scanned
	                                  max_code) { // and its largest code of non zero frequency
	        var n;			// iterates over all tree elements
	        var prevlen = -1;		// last emitted length
	        var curlen;			// length of current code
	        var nextlen = tree[0].dl;	// length of next code
	        var count = 0;		// repeat count of the current code
	        var max_count = 7;		// max repeat count
	        var min_count = 4;		// min repeat count

	        /* tree[max_code+1].dl = -1; */
	        /* guard already set */
	        if (nextlen == 0) {
	            max_count = 138;
	            min_count = 3;
	        }

	        for (n = 0; n <= max_code; n++) {
	            curlen = nextlen;
	            nextlen = tree[n + 1].dl;
	            if (++count < max_count && curlen == nextlen) {
	                continue;
	            } else if (count < min_count) {
	                do {
	                    zip_SEND_CODE(curlen, zip_bl_tree);
	                } while (--count != 0);
	            } else if (curlen != 0) {
	                if (curlen != prevlen) {
	                    zip_SEND_CODE(curlen, zip_bl_tree);
	                    count--;
	                }
	                // Assert(count >= 3 && count <= 6, " 3_6?");
	                zip_SEND_CODE(zip_REP_3_6, zip_bl_tree);
	                zip_send_bits(count - 3, 2);
	            } else if (count <= 10) {
	                zip_SEND_CODE(zip_REPZ_3_10, zip_bl_tree);
	                zip_send_bits(count - 3, 3);
	            } else {
	                zip_SEND_CODE(zip_REPZ_11_138, zip_bl_tree);
	                zip_send_bits(count - 11, 7);
	            }
	            count = 0;
	            prevlen = curlen;
	            if (nextlen == 0) {
	                max_count = 138;
	                min_count = 3;
	            } else if (curlen == nextlen) {
	                max_count = 6;
	                min_count = 3;
	            } else {
	                max_count = 7;
	                min_count = 4;
	            }
	        }
	    };

	    /* ==========================================================================
	     * Construct the Huffman tree for the bit lengths and return the index in
	     * bl_order of the last bit length code to send.
	     */
	    var zip_build_bl_tree = function () {
	        var max_blindex;  // index of last bit length code of non zero freq

	        // Determine the bit length frequencies for literal and distance trees
	        zip_scan_tree(zip_dyn_ltree, zip_l_desc.max_code);
	        zip_scan_tree(zip_dyn_dtree, zip_d_desc.max_code);

	        // Build the bit length tree:
	        zip_build_tree(zip_bl_desc);
	        /* opt_len now includes the length of the tree representations, except
	         * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
	         */

	        /* Determine the number of bit length codes to send. The pkzip format
	         * requires that at least 4 bit length codes be sent. (appnote.txt says
	         * 3 but the actual value used is 4.)
	         */
	        for (max_blindex = zip_BL_CODES - 1; max_blindex >= 3; max_blindex--) {
	            if (zip_bl_tree[zip_bl_order[max_blindex]].dl != 0) break;
	        }
	        /* Update opt_len to include the bit length tree and counts */
	        zip_opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
	        return max_blindex;
	    };

	    /* ==========================================================================
	     * Send the header for a block using dynamic Huffman trees: the counts, the
	     * lengths of the bit length codes, the literal tree and the distance tree.
	     * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
	     */
	    var zip_send_all_trees = function (lcodes, dcodes, blcodes) { // number of codes for each tree
	        var rank; // index in bl_order
	        zip_send_bits(lcodes - 257, 5); // not +255 as stated in appnote.txt
	        zip_send_bits(dcodes - 1, 5);
	        zip_send_bits(blcodes - 4, 4); // not -3 as stated in appnote.txt
	        for (rank = 0; rank < blcodes; rank++) {
	            zip_send_bits(zip_bl_tree[zip_bl_order[rank]].dl, 3);
	        }

	        // send the literal tree
	        zip_send_tree(zip_dyn_ltree, lcodes - 1);

	        // send the distance tree
	        zip_send_tree(zip_dyn_dtree, dcodes - 1);
	    };

	    /* ==========================================================================
	     * Determine the best encoding for the current block: dynamic trees, static
	     * trees or store, and output the encoded block to the zip file.
	     */
	    var zip_flush_block = function (eof) { // true if this is the last block for a file
	        var opt_lenb, static_lenb; // opt_len and static_len in bytes
	        var max_blindex;	// index of last bit length code of non zero freq
	        var stored_len;	// length of input block

	        stored_len = zip_strstart - zip_block_start;
	        zip_flag_buf[zip_last_flags] = zip_flags; // Save the flags for the last 8 items

	        // Construct the literal and distance trees
	        zip_build_tree(zip_l_desc);
	        zip_build_tree(zip_d_desc);
	        /* At this point, opt_len and static_len are the total bit lengths of
	         * the compressed block data, excluding the tree representations.
	         */

	        /* Build the bit length tree for the above two trees, and get the index
	         * in bl_order of the last bit length code to send.
	         */
	        max_blindex = zip_build_bl_tree();

	        // Determine the best encoding. Compute first the block length in bytes
	        opt_lenb = (zip_opt_len + 3 + 7) >> 3;
	        static_lenb = (zip_static_len + 3 + 7) >> 3;
	        if (static_lenb <= opt_lenb)
	            opt_lenb = static_lenb;
	        if (stored_len + 4 <= opt_lenb // 4: two words for the lengths
	            && zip_block_start >= 0) {
	            var i;

	            /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
	             * Otherwise we can't have processed more than WSIZE input bytes since
	             * the last block flush, because compression would have been
	             * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
	             * transform a block into a stored block.
	             */
	            zip_send_bits((zip_STORED_BLOCK << 1) + eof, 3);
	            /* send block type */
	            zip_bi_windup();
	            /* align on byte boundary */
	            zip_put_short(stored_len);
	            zip_put_short(~stored_len);

	            // copy block
	            for (i = 0; i < stored_len; i++)
	                zip_put_byte(zip_window[zip_block_start + i]);

	        } else if (static_lenb == opt_lenb) {
	            zip_send_bits((zip_STATIC_TREES << 1) + eof, 3);
	            zip_compress_block(zip_static_ltree, zip_static_dtree);
	        } else {
	            zip_send_bits((zip_DYN_TREES << 1) + eof, 3);
	            zip_send_all_trees(zip_l_desc.max_code + 1,
	                zip_d_desc.max_code + 1,
	                max_blindex + 1);
	            zip_compress_block(zip_dyn_ltree, zip_dyn_dtree);
	        }

	        zip_init_block();

	        if (eof != 0)
	            zip_bi_windup();
	    };

	    /* ==========================================================================
	     * Save the match info and tally the frequency counts. Return true if
	     * the current block must be flushed.
	     */
	    var zip_ct_tally = function (dist, // distance of matched string
	                                 lc) { // match length-MIN_MATCH or unmatched char (if dist==0)
	        zip_l_buf[zip_last_lit++] = lc;
	        if (dist == 0) {
	            // lc is the unmatched char
	            zip_dyn_ltree[lc].fc++;
	        } else {
	            // Here, lc is the match length - MIN_MATCH
	            dist--;		    // dist = match distance - 1
	            zip_dyn_ltree[zip_length_code[lc] + zip_LITERALS + 1].fc++;
	            zip_dyn_dtree[zip_D_CODE(dist)].fc++;

	            zip_d_buf[zip_last_dist++] = dist;
	            zip_flags |= zip_flag_bit;
	        }
	        zip_flag_bit <<= 1;

	        // Output the flags if they fill a byte
	        if ((zip_last_lit & 7) == 0) {
	            zip_flag_buf[zip_last_flags++] = zip_flags;
	            zip_flags = 0;
	            zip_flag_bit = 1;
	        }
	        // Try to guess if it is profitable to stop the current block here
	        if (zip_compr_level > 2 && (zip_last_lit & 0xfff) == 0) {
	            // Compute an upper bound for the compressed length
	            var out_length = zip_last_lit * 8;
	            var in_length = zip_strstart - zip_block_start;
	            var dcode;

	            for (dcode = 0; dcode < zip_D_CODES; dcode++) {
	                out_length += zip_dyn_dtree[dcode].fc * (5 + zip_extra_dbits[dcode]);
	            }
	            out_length >>= 3;
	            if (zip_last_dist < parseInt(zip_last_lit / 2) &&
	                out_length < parseInt(in_length / 2))
	                return true;
	        }
	        return (zip_last_lit == LIT_BUFSIZE - 1 ||
	            zip_last_dist == zip_DIST_BUFSIZE);
	        /* We avoid equality with LIT_BUFSIZE because of wraparound at 64K
	         * on 16 bit machines and because stored blocks are restricted to
	         * 64K-1 bytes.
	         */
	    };

	    /* ==========================================================================
	     * Send the block data compressed using the given Huffman trees
	     */
	    var zip_compress_block = function (ltree,	// literal tree
	                                       dtree) {	// distance tree
	        var dist;		// distance of matched string
	        var lc;		// match length or unmatched char (if dist == 0)
	        var lx = 0;		// running index in l_buf
	        var dx = 0;		// running index in d_buf
	        var fx = 0;		// running index in flag_buf
	        var flag = 0;	// current flags
	        var code;		// the code to send
	        var extra;		// number of extra bits to send

	        if (zip_last_lit != 0) do {
	            if ((lx & 7) == 0)
	                flag = zip_flag_buf[fx++];
	            lc = zip_l_buf[lx++] & 0xff;
	            if ((flag & 1) == 0) {
	                zip_SEND_CODE(lc, ltree);
	                /* send a literal byte */
	            } else {
	                // Here, lc is the match length - MIN_MATCH
	                code = zip_length_code[lc];
	                zip_SEND_CODE(code + zip_LITERALS + 1, ltree); // send the length code
	                extra = zip_extra_lbits[code];
	                if (extra != 0) {
	                    lc -= zip_base_length[code];
	                    zip_send_bits(lc, extra); // send the extra length bits
	                }
	                dist = zip_d_buf[dx++];
	                // Here, dist is the match distance - 1
	                code = zip_D_CODE(dist);
	                zip_SEND_CODE(code, dtree);	  // send the distance code
	                extra = zip_extra_dbits[code];
	                if (extra != 0) {
	                    dist -= zip_base_dist[code];
	                    zip_send_bits(dist, extra);   // send the extra distance bits
	                }
	            } // literal or match pair ?
	            flag >>= 1;
	        } while (lx < zip_last_lit);

	        zip_SEND_CODE(zip_END_BLOCK, ltree);
	    };

	    /* ==========================================================================
	     * Send a value on a given number of bits.
	     * IN assertion: length <= 16 and value fits in length bits.
	     */
	    var zip_Buf_size = 16; // bit size of bi_buf
	    var zip_send_bits = function (value,	// value to send
	                                  length) {	// number of bits
	        /* If not enough room in bi_buf, use (valid) bits from bi_buf and
	         * (16 - bi_valid) bits from value, leaving (width - (16-bi_valid))
	         * unused bits in value.
	         */
	        if (zip_bi_valid > zip_Buf_size - length) {
	            zip_bi_buf |= (value << zip_bi_valid);
	            zip_put_short(zip_bi_buf);
	            zip_bi_buf = (value >> (zip_Buf_size - zip_bi_valid));
	            zip_bi_valid += length - zip_Buf_size;
	        } else {
	            zip_bi_buf |= value << zip_bi_valid;
	            zip_bi_valid += length;
	        }
	    };

	    /* ==========================================================================
	     * Reverse the first len bits of a code, using straightforward code (a faster
	     * method would use a table)
	     * IN assertion: 1 <= len <= 15
	     */
	    var zip_bi_reverse = function (code,	// the value to invert
	                                   len) {	// its bit length
	        var res = 0;
	        do {
	            res |= code & 1;
	            code >>= 1;
	            res <<= 1;
	        } while (--len > 0);
	        return res >> 1;
	    };

	    /* ==========================================================================
	     * Write out any remaining bits in an incomplete byte.
	     */
	    var zip_bi_windup = function () {
	        if (zip_bi_valid > 8) {
	            zip_put_short(zip_bi_buf);
	        } else if (zip_bi_valid > 0) {
	            zip_put_byte(zip_bi_buf);
	        }
	        zip_bi_buf = 0;
	        zip_bi_valid = 0;
	    };

	    var zip_qoutbuf = function () {
	        if (zip_outcnt != 0) {
	            var q, i;
	            q = zip_new_queue();
	            if (zip_qhead == null)
	                zip_qhead = zip_qtail = q;
	            else
	                zip_qtail = zip_qtail.next = q;
	            q.len = zip_outcnt - zip_outoff;
	            for (i = 0; i < q.len; i++)
	                q.ptr[i] = zip_outbuf[zip_outoff + i];
	            zip_outcnt = zip_outoff = 0;
	        }
	    };

	    function deflate(buffData, level) {
	        zip_deflate_data = buffData;
	        zip_deflate_pos = 0;
	        zip_deflate_start(level);

	        var buff = new Array(1024),
	            pages = [],
	            totalSize = 0,
	            i;

	        for (i = 0; i < 1024; i++) buff[i] = 0;
	        while ((i = zip_deflate_internal(buff, 0, buff.length)) > 0) {
	            var buf = new Buffer(buff.slice(0, i));
	            pages.push(buf);
	            totalSize += buf.length;
	        }

	        if (pages.length == 1) {
	            return pages[0];
	        }

	        var result = new Buffer(totalSize),
	            index = 0;

	        for (i = 0; i < pages.length; i++) {
	            pages[i].copy(result, index);
	            index = index + pages[i].length
	        }

	        return result;
	    }

	    return {
	        deflate: function () {
	            return deflate(inbuf, 8);
	        }
	    }
	}

	module.exports = function (/*Buffer*/inbuf) {

	    var zlib = __webpack_require__(19);

	    return {
	        deflate: function () {
	            return new JSDeflater(inbuf).deflate();
	        },

	        deflateAsync: function (/*Function*/callback) {
	            var tmp = zlib.createDeflateRaw({chunkSize:(parseInt(inbuf.length / 1024) + 1)*1024}),
	                parts = [], total = 0;
	            tmp.on('data', function(data) {
	                parts.push(data);
	                total += data.length;
	            });
	            tmp.on('end', function() {
	                var buf = new Buffer(total), written = 0;
	                buf.fill(0);

	                for (var i = 0; i < parts.length; i++) {
	                    var part = parts[i];
	                    part.copy(buf, written);
	                    written += part.length;
	                }
	                callback && callback(buf);
	            });
	            tmp.end(inbuf);
	        }
	    }
	};


/***/ },
/* 19 */
/***/ function(module, exports) {

	module.exports = require("zlib");

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

	var Buffer = __webpack_require__(21).Buffer;

	function JSInflater(/*Buffer*/input) {

	    var WSIZE = 0x8000,
	        slide = new Buffer(0x10000),
	        windowPos = 0,
	        fixedTableList = null,
	        fixedTableDist,
	        fixedLookup,
	        bitBuf = 0,
	        bitLen = 0,
	        method = -1,
	        eof = false,
	        copyLen = 0,
	        copyDist = 0,
	        tblList, tblDist, bitList, bitdist,

	        inputPosition = 0,

	        MASK_BITS = [0x0000, 0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x003f, 0x007f, 0x00ff, 0x01ff, 0x03ff, 0x07ff, 0x0fff, 0x1fff, 0x3fff, 0x7fff, 0xffff],
	        LENS = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0],
	        LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0, 99, 99],
	        DISTS = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577],
	        DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13],
	        BITORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

	    function HuffTable(clen, cnum, cval, blist, elist, lookupm) {

	        this.status = 0;
	        this.root = null;
	        this.maxbit = 0;

	        var el, f, tail,
	            offsets = [],
	            countTbl = [],
	            sTbl = [],
	            values = [],
	            tentry = {extra: 0, bitcnt: 0, lbase: 0, next: null};

	        tail = this.root = null;
	        for(var i = 0; i < 0x11; i++)  { countTbl[i] = 0; sTbl[i] = 0; offsets[i] = 0; }
	        for(i = 0; i < 0x120; i++) values[i] = 0;

	        el = cnum > 256 ? clen[256] : 16;

	        var pidx = -1;
	        while (++pidx < cnum) countTbl[clen[pidx]]++;

	        if(countTbl[0] == cnum) return;

	        for(var j = 1; j <= 16; j++) if(countTbl[j] != 0) break;
	        var bitLen = j;
	        for(i = 16; i != 0; i--) if(countTbl[i] != 0) break;
	        var maxLen = i;

	        lookupm < j && (lookupm = j);

	        var dCodes = 1 << j;
	        for(; j < i; j++, dCodes <<= 1)
	            if((dCodes -= countTbl[j]) < 0) {
	                this.status = 2;
	                this.maxbit = lookupm;
	                return;
	            }

	        if((dCodes -= countTbl[i]) < 0) {
	            this.status = 2;
	            this.maxbit = lookupm;
	            return;
	        }

	        countTbl[i] += dCodes;
	        offsets[1] = j = 0;
	        pidx = 1;
	        var xp = 2;
	        while(--i > 0) offsets[xp++] = (j += countTbl[pidx++]);
	        pidx = 0;
	        i = 0;
	        do {
	            (j = clen[pidx++]) && (values[offsets[j]++] = i);
	        } while(++i < cnum);
	        cnum = offsets[maxLen];
	        offsets[0] = i = 0;
	        pidx = 0;

	        var level = -1,
	            w = sTbl[0] = 0,
	            cnode = null,
	            tblCnt = 0,
	            tblStack = [];

	        for(; bitLen <= maxLen; bitLen++) {
	            var kccnt = countTbl[bitLen];
	            while(kccnt-- > 0) {
	                while(bitLen > w + sTbl[1 + level]) {
	                    w += sTbl[1 + level];
	                    level++;
	                    tblCnt = (tblCnt = maxLen - w) > lookupm ? lookupm : tblCnt;
	                    if((f = 1 << (j = bitLen - w)) > kccnt + 1) {
	                        f -= kccnt + 1;
	                        xp = bitLen;
	                        while(++j < tblCnt) {
	                            if((f <<= 1) <= countTbl[++xp]) break;
	                            f -= countTbl[xp];
	                        }
	                    }
	                    if(w + j > el && w < el) j = el - w;
	                    tblCnt = 1 << j;
	                    sTbl[1 + level] = j;
	                    cnode = [];
	                    while (cnode.length < tblCnt) cnode.push({extra: 0, bitcnt: 0, lbase: 0, next: null});
	                    if (tail == null) {
	                        tail = this.root = {next:null, list:null};
	                    } else {
	                        tail = tail.next = {next:null, list:null}
	                    }
	                    tail.next = null;
	                    tail.list = cnode;

	                    tblStack[level] = cnode;

	                    if(level > 0) {
	                        offsets[level] = i;
	                        tentry.bitcnt = sTbl[level];
	                        tentry.extra = 16 + j;
	                        tentry.next = cnode;
	                        j = (i & ((1 << w) - 1)) >> (w - sTbl[level]);

	                        tblStack[level-1][j].extra = tentry.extra;
	                        tblStack[level-1][j].bitcnt = tentry.bitcnt;
	                        tblStack[level-1][j].lbase = tentry.lbase;
	                        tblStack[level-1][j].next = tentry.next;
	                    }
	                }
	                tentry.bitcnt = bitLen - w;
	                if(pidx >= cnum)
	                    tentry.extra = 99;
	                else if(values[pidx] < cval) {
	                    tentry.extra = (values[pidx] < 256 ? 16 : 15);
	                    tentry.lbase = values[pidx++];
	                } else {
	                    tentry.extra = elist[values[pidx] - cval];
	                    tentry.lbase = blist[values[pidx++] - cval];
	                }

	                f = 1 << (bitLen - w);
	                for(j = i >> w; j < tblCnt; j += f) {
	                    cnode[j].extra = tentry.extra;
	                    cnode[j].bitcnt = tentry.bitcnt;
	                    cnode[j].lbase = tentry.lbase;
	                    cnode[j].next = tentry.next;
	                }
	                for(j = 1 << (bitLen - 1); (i & j) != 0; j >>= 1)
	                    i ^= j;
	                i ^= j;
	                while((i & ((1 << w) - 1)) != offsets[level]) {
	                    w -= sTbl[level];
	                    level--;
	                }
	            }
	        }

	        this.maxbit = sTbl[1];
	        this.status = ((dCodes != 0 && maxLen != 1) ? 1 : 0);
	    }

	    function addBits(n) {
	        while(bitLen < n) {
	            bitBuf |= input[inputPosition++] << bitLen;
	            bitLen += 8;
	        }
	        return bitBuf;
	    }

	    function cutBits(n) {
	        bitLen -= n;
	        return bitBuf >>= n;
	    }

	    function maskBits(n) {
	        while(bitLen < n) {
	            bitBuf |= input[inputPosition++] << bitLen;
	            bitLen += 8;
	        }
	        var res = bitBuf & MASK_BITS[n];
	        bitBuf >>= n;
	        bitLen -= n;
	        return res;
	    }

	    function codes(buff, off, size) {
	        var e, t;
	        if(size == 0) return 0;

	        var n = 0;
	        for(;;) {
	            t = tblList.list[addBits(bitList) & MASK_BITS[bitList]];
	            e = t.extra;
	            while(e > 16) {
	                if(e == 99) return -1;
	                cutBits(t.bitcnt);
	                e -= 16;
	                t = t.next[addBits(e) & MASK_BITS[e]];
	                e = t.extra;
	            }
	            cutBits(t.bitcnt);
	            if(e == 16) {
	                windowPos &= WSIZE - 1;
	                buff[off + n++] = slide[windowPos++] = t.lbase;
	                if(n == size) return size;
	                continue;
	            }
	            if(e == 15) break;

	            copyLen = t.lbase + maskBits(e);
	            t = tblDist.list[addBits(bitdist) & MASK_BITS[bitdist]];
	            e = t.extra;

	            while(e > 16) {
	                if(e == 99) return -1;
	                cutBits(t.bitcnt);
	                e -= 16;
	                t = t.next[addBits(e) & MASK_BITS[e]];
	                e = t.extra
	            }
	            cutBits(t.bitcnt);
	            copyDist = windowPos - t.lbase - maskBits(e);

	            while(copyLen > 0 && n < size) {
	                copyLen--;
	                copyDist &= WSIZE - 1;
	                windowPos &= WSIZE - 1;
	                buff[off + n++] = slide[windowPos++] = slide[copyDist++];
	            }

	            if(n == size) return size;
	        }

	        method = -1; // done
	        return n;
	    }

	    function stored(buff, off, size) {
	        cutBits(bitLen & 7);
	        var n = maskBits(0x10);
	        if(n != ((~maskBits(0x10)) & 0xffff)) return -1;
	        copyLen = n;

	        n = 0;
	        while(copyLen > 0 && n < size) {
	            copyLen--;
	            windowPos &= WSIZE - 1;
	            buff[off + n++] = slide[windowPos++] = maskBits(8);
	        }

	        if(copyLen == 0) method = -1;
	        return n;
	    }

	    function fixed(buff, off, size) {
	        var fixed_bd = 0;
	        if(fixedTableList == null) {
	            var lengths = [];

	            for(var symbol = 0; symbol < 144; symbol++) lengths[symbol] = 8;
	            for(; symbol < 256; symbol++) lengths[symbol] = 9;
	            for(; symbol < 280; symbol++) lengths[symbol] = 7;
	            for(; symbol < 288; symbol++) lengths[symbol] = 8;

	            fixedLookup = 7;

	            var htbl = new HuffTable(lengths, 288, 257, LENS, LEXT, fixedLookup);

	            if(htbl.status != 0) return -1;

	            fixedTableList = htbl.root;
	            fixedLookup = htbl.maxbit;

	            for(symbol = 0; symbol < 30; symbol++) lengths[symbol] = 5;
	            fixed_bd = 5;

	            htbl = new HuffTable(lengths, 30, 0, DISTS, DEXT, fixed_bd);
	            if(htbl.status > 1) {
	                fixedTableList = null;
	                return -1;
	            }
	            fixedTableDist = htbl.root;
	            fixed_bd = htbl.maxbit;
	        }

	        tblList = fixedTableList;
	        tblDist = fixedTableDist;
	        bitList = fixedLookup;
	        bitdist = fixed_bd;
	        return codes(buff, off, size);
	    }

	    function dynamic(buff, off, size) {
	        var ll = new Array(0x023C);

	        for (var m = 0; m < 0x023C; m++) ll[m] = 0;

	        var llencnt = 257 + maskBits(5),
	            dcodescnt = 1 + maskBits(5),
	            bitlencnt = 4 + maskBits(4);

	        if(llencnt > 286 || dcodescnt > 30) return -1;

	        for(var j = 0; j < bitlencnt; j++) ll[BITORDER[j]] = maskBits(3);
	        for(; j < 19; j++) ll[BITORDER[j]] = 0;

	        // build decoding table for trees--single level, 7 bit lookup
	        bitList = 7;
	        var hufTable = new HuffTable(ll, 19, 19, null, null, bitList);
	        if(hufTable.status != 0)
	            return -1;	// incomplete code set

	        tblList = hufTable.root;
	        bitList = hufTable.maxbit;
	        var lencnt = llencnt + dcodescnt,
	            i = 0,
	            lastLen = 0;
	        while(i < lencnt) {
	            var hufLcode = tblList.list[addBits(bitList) & MASK_BITS[bitList]];
	            j = hufLcode.bitcnt;
	            cutBits(j);
	            j = hufLcode.lbase;
	            if(j < 16)
	                ll[i++] = lastLen = j;
	            else if(j == 16) {
	                j = 3 + maskBits(2);
	                if(i + j > lencnt) return -1;
	                while(j-- > 0) ll[i++] = lastLen;
	            } else if(j == 17) {
	                j = 3 + maskBits(3);
	                if(i + j > lencnt) return -1;
	                while(j-- > 0) ll[i++] = 0;
	                lastLen = 0;
	            } else {
	                j = 11 + maskBits(7);
	                if(i + j > lencnt) return -1;
	                while(j-- > 0) ll[i++] = 0;
	                lastLen = 0;
	            }
	        }
	        bitList = 9;
	        hufTable = new HuffTable(ll, llencnt, 257, LENS, LEXT, bitList);
	        bitList == 0 && (hufTable.status = 1);

	        if (hufTable.status != 0) return -1;

	        tblList = hufTable.root;
	        bitList = hufTable.maxbit;

	        for(i = 0; i < dcodescnt; i++) ll[i] = ll[i + llencnt];
	        bitdist = 6;
	        hufTable = new HuffTable(ll, dcodescnt, 0, DISTS, DEXT, bitdist);
	        tblDist = hufTable.root;
	        bitdist = hufTable.maxbit;

	        if((bitdist == 0 && llencnt > 257) || hufTable.status != 0) return -1;

	        return codes(buff, off, size);
	    }

	    return {
	        inflate : function(/*Buffer*/outputBuffer) {
	            tblList = null;

	            var size = outputBuffer.length,
	                offset = 0, i;

	            while(offset < size) {
	                if(eof && method == -1) return;
	                if(copyLen > 0) {
	                    if(method != 0) {
	                        while(copyLen > 0 && offset < size) {
	                            copyLen--;
	                            copyDist &= WSIZE - 1;
	                            windowPos &= WSIZE - 1;
	                            outputBuffer[offset++] = (slide[windowPos++] = slide[copyDist++]);
	                        }
	                    } else {
	                        while(copyLen > 0 && offset < size) {
	                            copyLen--;
	                            windowPos &= WSIZE - 1;
	                            outputBuffer[offset++] = (slide[windowPos++] = maskBits(8));
	                        }
	                        copyLen == 0 && (method = -1); // done
	                    }
	                    if (offset == size) return;
	                }

	                if(method == -1) {
	                    if(eof) break;
	                    eof = maskBits(1) != 0;
	                    method = maskBits(2);
	                    tblList = null;
	                    copyLen = 0;
	                }
	                switch(method) {
	                    case 0: i = stored(outputBuffer, offset, size - offset); break;
	                    case 1: i = tblList != null ? codes(outputBuffer, offset, size - offset) : fixed(outputBuffer, offset, size - offset); break;
	                    case 2: i = tblList != null ? codes(outputBuffer, offset, size - offset) : dynamic(outputBuffer, offset, size - offset); break;
	                    default: i = -1; break;
	                }

	                if(i == -1) return;
	                offset += i;
	            }
	        }
	    };
	}

	module.exports = function(/*Buffer*/inbuf) {
	    var zlib = __webpack_require__(19);
	    return {
	        inflateAsync : function(/*Function*/callback) {
	            var tmp = zlib.createInflateRaw(),
	                parts = [], total = 0;
	            tmp.on('data', function(data) {
	                parts.push(data);
	                total += data.length;
	            });
	            tmp.on('end', function() {
	                var buf = new Buffer(total), written = 0;
	                buf.fill(0);

	                for (var i = 0; i < parts.length; i++) {
	                    var part = parts[i];
	                    part.copy(buf, written);
	                    written += part.length;
	                }
	                callback && callback(buf);
	            });
	            tmp.end(inbuf)
	        },

	        inflate : function(/*Buffer*/outputBuffer) {
	            var x = {
	                x: new JSInflater(inbuf)
	            };
	            x.x.inflate(outputBuffer);
	            delete(x.x);
	        }
	    }
	};


/***/ },
/* 21 */
/***/ function(module, exports) {

	module.exports = require("buffer");

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	var ZipEntry = __webpack_require__(8),
	    Headers = __webpack_require__(14),
	    Utils = __webpack_require__(9);

	module.exports = function(/*String|Buffer*/input, /*Number*/inputType) {
	    var entryList = [],
	        entryTable = {},
	        _comment = new Buffer(0),
	        filename = "",
	        fs = __webpack_require__(5),
	        inBuffer = null,
	        mainHeader = new Headers.MainHeader();

	    if (inputType == Utils.Constants.FILE) {
	        // is a filename
	        filename = input;
	        inBuffer = fs.readFileSync(filename);
	        readMainHeader();
	    } else if (inputType == Utils.Constants.BUFFER) {
	        // is a memory buffer
	        inBuffer = input;
	        readMainHeader();
	    } else {
	        // none. is a new file
	    }

	    function readEntries() {
	        entryTable = {};
	        entryList = new Array(mainHeader.diskEntries);  // total number of entries
	        var index = mainHeader.offset;  // offset of first CEN header
	        for(var i = 0; i < entryList.length; i++) {

	            var tmp = index,
	                entry = new ZipEntry(inBuffer);
	            entry.header = inBuffer.slice(tmp, tmp += Utils.Constants.CENHDR);

	            entry.entryName = inBuffer.slice(tmp, tmp += entry.header.fileNameLength);

	            if (entry.header.extraLength) {
	                entry.extra = inBuffer.slice(tmp, tmp += entry.header.extraLength);
	            }

	            if (entry.header.commentLength)
	                entry.comment = inBuffer.slice(tmp, tmp + entry.header.commentLength);

	            index += entry.header.entryHeaderSize;

	            entryList[i] = entry;
	            entryTable[entry.entryName] = entry;
	        }
	    }

	    function readMainHeader() {
	        var i = inBuffer.length - Utils.Constants.ENDHDR, // END header size
	            n = Math.max(0, i - 0xFFFF), // 0xFFFF is the max zip file comment length
	            endOffset = -1; // Start offset of the END header

	        for (i; i >= n; i--) {
	            if (inBuffer[i] != 0x50) continue; // quick check that the byte is 'P'
	            if (inBuffer.readUInt32LE(i) == Utils.Constants.ENDSIG) { // "PK\005\006"
	                endOffset = i;
	                break;
	            }
	        }
	        if (!~endOffset)
	            throw Utils.Errors.INVALID_FORMAT;

	        mainHeader.loadFromBinary(inBuffer.slice(endOffset, endOffset + Utils.Constants.ENDHDR));
	        if (mainHeader.commentLength) {
	            _comment = inBuffer.slice(endOffset + Utils.Constants.ENDHDR);
	        }
	        readEntries();
	    }

	    return {
	        /**
	         * Returns an array of ZipEntry objects existent in the current opened archive
	         * @return Array
	         */
	        get entries () {
	            return entryList;
	        },

	        /**
	         * Archive comment
	         * @return {String}
	         */
	        get comment () { return _comment.toString(); },
	        set comment(val) {
	            mainHeader.commentLength = val.length;
	            _comment = val;
	        },

	        /**
	         * Returns a reference to the entry with the given name or null if entry is inexistent
	         *
	         * @param entryName
	         * @return ZipEntry
	         */
	        getEntry : function(/*String*/entryName) {
	            return entryTable[entryName] || null;
	        },

	        /**
	         * Adds the given entry to the entry list
	         *
	         * @param entry
	         */
	        setEntry : function(/*ZipEntry*/entry) {
	            entryList.push(entry);
	            entryTable[entry.entryName] = entry;
	            mainHeader.totalEntries = entryList.length;
	        },

	        /**
	         * Removes the entry with the given name from the entry list.
	         *
	         * If the entry is a directory, then all nested files and directories will be removed
	         * @param entryName
	         */
	        deleteEntry : function(/*String*/entryName) {
	            var entry = entryTable[entryName];
	            if (entry && entry.isDirectory) {
	                var _self = this;
	                this.getEntryChildren(entry).forEach(function(child) {
	                    if (child.entryName != entryName) {
	                        _self.deleteEntry(child.entryName)
	                    }
	                })
	            }
	            entryList.splice(entryList.indexOf(entry), 1);
	            delete(entryTable[entryName]);
	            mainHeader.totalEntries = entryList.length;
	        },

	        /**
	         *  Iterates and returns all nested files and directories of the given entry
	         *
	         * @param entry
	         * @return Array
	         */
	        getEntryChildren : function(/*ZipEntry*/entry) {
	            if (entry.isDirectory) {
	                var list = [],
	                    name = entry.entryName,
	                    len = name.length;

	                entryList.forEach(function(zipEntry) {
	                    if (zipEntry.entryName.substr(0, len) == name) {
	                        list.push(zipEntry);
	                    }
	                });
	                return list;
	            }
	            return []
	        },

	        /**
	         * Returns the zip file
	         *
	         * @return Buffer
	         */
	        compressToBuffer : function() {
	            if (entryList.length > 1) {
	                entryList.sort(function(a, b) {
	                    var nameA = a.entryName.toLowerCase();
	                    var nameB = b.entryName.toLowerCase();
	                    if (nameA < nameB) {return -1}
	                    if (nameA > nameB) {return 1}
	                    return 0;
	                });
	            }

	            var totalSize = 0,
	                dataBlock = [],
	                entryHeaders = [],
	                dindex = 0;

	            mainHeader.size = 0;
	            mainHeader.offset = 0;

	            entryList.forEach(function(entry) {
	                entry.header.offset = dindex;

	                // compress data and set local and entry header accordingly. Reason why is called first
	                var compressedData = entry.getCompressedData();
	                // data header
	                var dataHeader = entry.header.dataHeaderToBinary();
	                var postHeader = new Buffer(entry.entryName + entry.extra.toString());
	                var dataLength = dataHeader.length + postHeader.length + compressedData.length;

	                dindex += dataLength;

	                dataBlock.push(dataHeader);
	                dataBlock.push(postHeader);
	                dataBlock.push(compressedData);

	                var entryHeader = entry.packHeader();
	                entryHeaders.push(entryHeader);
	                mainHeader.size += entryHeader.length;
	                totalSize += (dataLength + entryHeader.length);
	            });

	            totalSize += mainHeader.mainHeaderSize; // also includes zip file comment length
	            // point to end of data and begining of central directory first record
	            mainHeader.offset = dindex;

	            dindex = 0;
	            var outBuffer = new Buffer(totalSize);
	            dataBlock.forEach(function(content) {
	                content.copy(outBuffer, dindex); // write data blocks
	                dindex += content.length;
	            });
	            entryHeaders.forEach(function(content) {
	                content.copy(outBuffer, dindex); // write central directory entries
	                dindex += content.length;
	            });

	            var mh = mainHeader.toBinary();
	            if (_comment) {
	                _comment.copy(mh, Utils.Constants.ENDHDR); // add zip file comment
	            }

	            mh.copy(outBuffer, dindex); // write main header

	            return outBuffer
	        },

	        toAsyncBuffer : function(/*Function*/onSuccess,/*Function*/onFail,/*Function*/onItemStart,/*Function*/onItemEnd) {
	            if (entryList.length > 1) {
	                entryList.sort(function(a, b) {
	                    var nameA = a.entryName.toLowerCase();
	                    var nameB = b.entryName.toLowerCase();
	                    if (nameA > nameB) {return -1}
	                    if (nameA < nameB) {return 1}
	                    return 0;
	                });
	            }

	            var totalSize = 0,
	                dataBlock = [],
	                entryHeaders = [],
	                dindex = 0;

	            mainHeader.size = 0;
	            mainHeader.offset = 0;

	            var compress=function(entryList){
	                var self=arguments.callee;
	                var entry;
	                if(entryList.length){
	                    var entry=entryList.pop();
	                    var name=entry.entryName + entry.extra.toString();
	                    if(onItemStart)onItemStart(name);
	                    entry.getCompressedDataAsync(function(compressedData){
	                        if(onItemEnd)onItemEnd(name);

	                        entry.header.offset = dindex;
	                        // data header
	                        var dataHeader = entry.header.dataHeaderToBinary();
	                        var postHeader = new Buffer(name);
	                        var dataLength = dataHeader.length + postHeader.length + compressedData.length;

	                        dindex += dataLength;

	                        dataBlock.push(dataHeader);
	                        dataBlock.push(postHeader);
	                        dataBlock.push(compressedData);

	                        var entryHeader = entry.packHeader();
	                        entryHeaders.push(entryHeader);
	                        mainHeader.size += entryHeader.length;
	                        totalSize += (dataLength + entryHeader.length);

	                        if(entryList.length){
	                            self(entryList);
	                        }else{


	                            totalSize += mainHeader.mainHeaderSize; // also includes zip file comment length
	                            // point to end of data and begining of central directory first record
	                            mainHeader.offset = dindex;

	                            dindex = 0;
	                            var outBuffer = new Buffer(totalSize);
	                            dataBlock.forEach(function(content) {
	                                content.copy(outBuffer, dindex); // write data blocks
	                                dindex += content.length;
	                            });
	                            entryHeaders.forEach(function(content) {
	                                content.copy(outBuffer, dindex); // write central directory entries
	                                dindex += content.length;
	                            });

	                            var mh = mainHeader.toBinary();
	                            if (_comment) {
	                                _comment.copy(mh, Utils.Constants.ENDHDR); // add zip file comment
	                            }

	                            mh.copy(outBuffer, dindex); // write main header

	                            onSuccess(outBuffer);
	                        }
	                    });
	                }
	            };

	            compress(entryList);
	        }
	    }
	};


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Created by Riven on 2016/12/15.
	 */

	/**
	 * Created by Riven on 10/7/16.
	 */
	"use strict";

	var fs = __webpack_require__(5);
	var cp = __webpack_require__(24);
	var ncp = __webpack_require__(25).ncp;

	var ArduinoManager = function ArduinoManager() {
	    this.autotranslate = false;
	    this.sendCmdEvent = new chrome.Event();
	    this.baudrate = 115200;
	    this.editor = null;
	    this.arduinopath = "D:\\AAAA";
	    this.arduinoboard = "uno";
	    this.boardlist = [{ "name": "Arduino UNO", "type": "uno" }, { "name": "Arduino NANO", "type": "nano:cpu=atmega328" }];
	    this.selectedBoard = "Arduino UNO";
	    this.lastSerialPort = "COM6";
	    this.autotranslate = false;
	    this.digitalQuery = {};
	    this.analogQuery = {};
	    this.appendLog = null;
	    this.notify = null;
	};

	ArduinoManager.prototype.checkArduinoPath = function (callback) {
	    fs.access(this.arduinopath, fs.F_OK, function (err) {
	        if (err) {
	            if (callback) {
	                callback(err);
	            }
	            throw err;
	        } else {
	            callback(0);
	        }
	    });
	};

	ArduinoManager.prototype.sb2cpp = function () {
	    try {
	        var code = "";
	        code += Blockly.Arduino.workspaceToCode(workspace);
	        if (this.editor) {
	            this.editor.setValue(code, -1);
	        } else {
	            console.log("arduino code generator:");
	            console.log(code);
	        }
	    } catch (e) {
	        this.appendLog(e.message, "#E77471");
	    }
	};

	ArduinoManager.prototype.copyLibrary = function (src, callback) {
	    var dst = this.arduinopath + "/libraries";
	    if (process.platform == "darwin") {
	        dst = this.arduinopath + "/Arduino.app/Contents/Java/libraries";
	    }
	    ncp(src, dst, function (err) {
	        if (err) {
	            if (callback) callback(err);
	            throw err;
	        }
	        if (callback) callback(0);
	    });
	};

	ArduinoManager.prototype.loadFactoryFirmware = function (inofilepath) {
	    var code = fs.readFileSync(inofilepath, 'utf8');
	    this.editor.setValue(code, -1);
	};

	ArduinoManager.prototype.openArduinoIde = function (code, path) {
	    this.checkArduinoPath();
	    var arduinoPath = this.arduinopath;
	    fs.writeFile(path, code, function (err) {
	        if (err) {
	            console.log("Save error " + err);
	            throw err;
	        } else {
	            var cmd = "arduino.exe " + path;
	            if (process.platform == "darwin") {
	                cmd = "Arduino.app/Contents/MacOS/Arduino " + path;
	            }
	            var spawn = cp.exec(cmd, {
	                encoding: 'utf8',
	                cwd: arduinoPath
	            });
	        }
	    });
	};

	ArduinoManager.prototype.parseLine = function (msg) {
	    var ret = null;
	    this.appendLog(msg, "LightSkyBlue");
	    if (msg.indexOf("M3") > -1) {
	        var tmp = msg.trim().split(" ");
	        var pin = tmp[1];
	        var val = tmp[2];
	        this.digitalQuery[pin] = val;
	    } else if (msg.indexOf("M5") > -1) {
	        var tmp = msg.trim().split(" ");
	        var pin = tmp[1];
	        var val = tmp[2];
	        this.analogQuery[pin] = val;
	    } else if (msg.indexOf("M101") > -1) {
	        window.vm.postIOData('serial', { slot: "M101", report: null });
	    } else if (msg.indexOf("M8") > -1) {
	        ret = msg.trim().split(" ")[1];
	        window.vm.postIOData('serial', { slot: "M8", report: ret });
	    } else if (msg.indexOf("M110") > -1) {
	        var tmp = msg.trim().split(" ");
	        var pin = tmp[1];
	        var val = tmp[2];
	        window.vm.postIOData('serial', { slot: "M110 " + pin, report: val });
	    } else if (msg.indexOf("M202") > -1) {
	        ret = msg.trim().split(" ")[1];
	        window.vm.postIOData('serial', { slot: "M202", report: ret });
	    }
	};

	ArduinoManager.prototype.queryData = function (data) {
	    if (data.type == 'D') {
	        if (this.digitalQuery[data.pin]) {
	            return this.digitalQuery[data.pin];
	        } else {
	            var cmd = "M13 " + data.pin + " 1";
	            this.sendCmd(cmd);
	            return 0;
	        }
	    } else if (data.type == 'A') {
	        if (this.analogQuery[data.pin]) {
	            return this.analogQuery[data.pin];
	        } else {
	            var cmd = "M15 " + data.pin + " 1";
	            this.sendCmd(cmd);
	            return 0;
	        }
	    }
	};

	ArduinoManager.prototype.stopAll = function () {
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

	ArduinoManager.prototype.sendCmd = function (msg) {
	    this.sendCmdEvent.dispatch(msg);
	};

	function buildUploadCommand(inofile, cmdType, arduinoboard, arduinopath, lastSerialPort) {
	    if (!cmdType) {
	        cmdType = "upload";
	    }
	    var exec = "arduino.exe";
	    if (process.platform == "darwin") {
	        exec = "Arduino.app/Contents/MacOS/Arduino";
	    }
	    var builtpath = process.cwd() + "/workspace/build/";
	    //var verbose = config.debug==true?"-v":"";

	    var verbose = "-v"; // always use verbose to get compile feedback
	    var cmd = exec + " " + verbose + " --" + cmdType + " --pref build.path=" + builtpath + " --board arduino:avr:" + arduinoboard + " --port " + lastSerialPort + " " + process.cwd() + inofile;
	    return cmd;
	}

	ArduinoManager.prototype.compileCode = function (path, callback, errCallback) {
	    var errorcode = null;
	    var arduinopath = this.arduinopath;
	    this.checkArduinoPath();

	    var cmd = buildUploadCommand(path, "verify", this.arduinoboard, this.arduinopath, this.lastSerialPort);
	    console.log(cmd);

	    var spawn = cp.exec(cmd, {
	        encoding: 'utf8',
	        cwd: arduinopath
	    });
	    this.appendLog(">>" + cmd, 'blue');

	    function setHexpath(hexpath) {
	        this.hexpath = hexpath;
	    }

	    spawn.stdout.on('data', function (data) {
	        if (data.indexOf("error") > -1) {
	            errCallback(data, 'orange');
	            errorcode = data;
	        } else if (data.indexOf("cpp.hex") > -1) {
	            //appendLog(data,'cyan');
	            var hexpath = data.toString().trim().split(" ").pop().replace(/\\/g, "/");
	            setHexpath(hexpath);
	        } else {
	            this.appendLog(data, 'grey');
	        }
	    });

	    spawn.stdout.on('end', function (code) {
	        appendLog("Compile Finished");
	        if (callback && !errorcode) {
	            callback();
	        }
	    });
	    spawn.stderr.on('data', function (data) {
	        appendLog(data, 'grey');
	    });
	};

	ArduinoManager.prototype.uploadCode = function (path) {
	    KBlock.arduino.checkArduinoPath();
	    if (KBlock.serial.connectionId != -1) {
	        KBlock.serial.disconnect();
	    }
	    var cmd = buildUploadCommand(path); // temporary project folder
	    console.log(cmd);

	    var spawn = cp.exec(cmd, {
	        encoding: 'utf8',
	        cwd: KBlock.arduino.arduinopath
	    });
	    appendLog("Start Download");
	    appendLog(">>" + cmd, 'blue');

	    spawn.stdout.on('data', function (data) {
	        appendLog(data, 'grey');
	    });
	    spawn.stdout.on('end', function (code) {
	        appendLog("Download Finished");
	    });
	    spawn.stderr.on('data', function (data) {
	        if (data.indexOf("can't open device") > -1) {
	            wzNotify("can't open device ", "danger");
	            appendLog(data, 'orange');
	        } else if (data.indexOf("error") > -1) {
	            wzNotify(data, "danger");
	            appendLog(data, 'orange');
	        } else {
	            appendLog(data, 'grey');
	        }
	    });
	};

	ArduinoManager.prototype.uploadProject = function () {
	    var code = this.editor.getValue();
	    var path = process.cwd() + "/arduino/project/project.ino";
	    fs.writeFile(path, code, function (err) {
	        if (err) {
	            console.log("Save error " + err);
	        } else {
	            if (KBlock.connected == "ipPort") {
	                KBlock.arduino.compileCode("/arduino/project/project.ino", function () {
	                    KBlock.udp.loadHex(KBlock.hexpath);
	                    KBlock.udp.stkStart();
	                });
	            } else {
	                KBlock.arduino.uploadCode("/arduino/project/project.ino");
	            }
	        }
	    });
	};

	ArduinoManager.prototype.tick = function () {
	    if (this.autotranslate) {
	        this.sb2cpp();
	    }
	};

	module.exports = ArduinoManager;

/***/ },
/* 24 */
/***/ function(module, exports) {

	module.exports = require("child_process");

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	var fs = __webpack_require__(5),
	    path = __webpack_require__(6);

	module.exports = ncp;
	ncp.ncp = ncp;

	function ncp(source, dest, options, callback) {
	    var cback = callback;

	    if (!callback) {
	        cback = options;
	        options = {};
	    }

	    var basePath = process.cwd(),
	        currentPath = path.resolve(basePath, source),
	        targetPath = path.resolve(basePath, dest),
	        filter = options.filter,
	        rename = options.rename,
	        transform = options.transform,
	        clobber = options.clobber !== false,
	        modified = options.modified,
	        dereference = options.dereference,
	        errs = null,
	        started = 0,
	        finished = 0,
	        running = 0,
	        limit = options.limit || ncp.limit || 16;

	    limit = limit < 1 ? 1 : limit > 512 ? 512 : limit;

	    startCopy(currentPath);

	    function startCopy(source) {
	        started++;
	        if (filter) {
	            if (filter instanceof RegExp) {
	                if (!filter.test(source)) {
	                    return cb(true);
	                }
	            } else if (typeof filter === 'function') {
	                if (!filter(source)) {
	                    return cb(true);
	                }
	            }
	        }
	        return getStats(source);
	    }

	    function getStats(source) {
	        var stat = dereference ? fs.stat : fs.lstat;
	        if (running >= limit) {
	            return setImmediate(function () {
	                getStats(source);
	            });
	        }
	        running++;
	        stat(source, function (err, stats) {
	            var item = {};
	            if (err) {
	                return onError(err);
	            }

	            // We need to get the mode from the stats object and preserve it.
	            item.name = source;
	            item.mode = stats.mode;
	            item.mtime = stats.mtime; //modified time
	            item.atime = stats.atime; //access time

	            if (stats.isDirectory()) {
	                return onDir(item);
	            } else if (stats.isFile()) {
	                return onFile(item);
	            } else if (stats.isSymbolicLink()) {
	                // Symlinks don't really need to know about the mode.
	                return onLink(source);
	            }
	        });
	    }

	    function onFile(file) {
	        var target = file.name.replace(currentPath, targetPath);
	        if (rename) {
	            target = rename(target);
	        }
	        isWritable(target, function (writable) {
	            if (writable) {
	                return copyFile(file, target);
	            }
	            if (clobber) {
	                rmFile(target, function () {
	                    copyFile(file, target);
	                });
	            }
	            if (modified) {
	                var stat = dereference ? fs.stat : fs.lstat;
	                stat(target, function (err, stats) {
	                    //if souce modified time greater to target modified time copy file
	                    if (file.mtime.getTime() > stats.mtime.getTime()) copyFile(file, target);else return cb();
	                });
	            } else {
	                return cb();
	            }
	        });
	    }

	    function copyFile(file, target) {
	        var readStream = fs.createReadStream(file.name),
	            writeStream = fs.createWriteStream(target, { mode: file.mode });

	        readStream.on('error', onError);
	        writeStream.on('error', onError);

	        if (transform) {
	            transform(readStream, writeStream, file);
	        } else {
	            writeStream.on('open', function () {
	                readStream.pipe(writeStream);
	            });
	        }
	        writeStream.once('finish', function () {
	            if (modified) {
	                //target file modified date sync.
	                fs.utimesSync(target, file.atime, file.mtime);
	                cb();
	            } else cb();
	        });
	    }

	    function rmFile(file, done) {
	        fs.unlink(file, function (err) {
	            if (err) {
	                return onError(err);
	            }
	            return done();
	        });
	    }

	    function onDir(dir) {
	        var target = dir.name.replace(currentPath, targetPath);
	        isWritable(target, function (writable) {
	            if (writable) {
	                return mkDir(dir, target);
	            }
	            copyDir(dir.name);
	        });
	    }

	    function mkDir(dir, target) {
	        fs.mkdir(target, dir.mode, function (err) {
	            if (err) {
	                return onError(err);
	            }
	            copyDir(dir.name);
	        });
	    }

	    function copyDir(dir) {
	        fs.readdir(dir, function (err, items) {
	            if (err) {
	                return onError(err);
	            }
	            items.forEach(function (item) {
	                startCopy(path.join(dir, item));
	            });
	            return cb();
	        });
	    }

	    function onLink(link) {
	        var target = link.replace(currentPath, targetPath);
	        fs.readlink(link, function (err, resolvedPath) {
	            if (err) {
	                return onError(err);
	            }
	            checkLink(resolvedPath, target);
	        });
	    }

	    function checkLink(resolvedPath, target) {
	        if (dereference) {
	            resolvedPath = path.resolve(basePath, resolvedPath);
	        }
	        isWritable(target, function (writable) {
	            if (writable) {
	                return makeLink(resolvedPath, target);
	            }
	            fs.readlink(target, function (err, targetDest) {
	                if (err) {
	                    return onError(err);
	                }
	                if (dereference) {
	                    targetDest = path.resolve(basePath, targetDest);
	                }
	                if (targetDest === resolvedPath) {
	                    return cb();
	                }
	                return rmFile(target, function () {
	                    makeLink(resolvedPath, target);
	                });
	            });
	        });
	    }

	    function makeLink(linkPath, target) {
	        fs.symlink(linkPath, target, function (err) {
	            if (err) {
	                return onError(err);
	            }
	            return cb();
	        });
	    }

	    function isWritable(path, done) {
	        fs.lstat(path, function (err) {
	            if (err) {
	                if (err.code === 'ENOENT') return done(true);
	                return done(false);
	            }
	            return done(false);
	        });
	    }

	    function onError(err) {
	        if (options.stopOnError) {
	            return cback(err);
	        } else if (!errs && options.errs) {
	            errs = fs.createWriteStream(options.errs);
	        } else if (!errs) {
	            errs = [];
	        }
	        if (typeof errs.write === 'undefined') {
	            errs.push(err);
	        } else {
	            errs.write(err.stack + '\n\n');
	        }
	        return cb();
	    }

	    function cb(skipped) {
	        if (!skipped) running--;
	        finished++;
	        if (started === finished && running === 0) {
	            if (cback !== undefined) {
	                return errs ? cback(errs) : cback(null);
	            }
	        }
	    }
	}

/***/ },
/* 26 */
/***/ function(module, exports) {

	/**
	 * Created by Riven on 2016/12/16.
	 */
	"use strict";

	var Toolbox = function Toolbox() {};

	Toolbox.prototype.getDefalutToolBox = function (Msg) {
	    var ret = '<xml id="toolbox-categories" style="display: none">' + '<category name="' + Msg.MOTION + '" colour="#4C97FF" secondaryColour="#3373CC">' + '<block type="motion_movesteps">' + '<value name="STEPS">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_turnright">' + '<value name="DEGREES">' + '<shadow type="math_number">' + '<field name="NUM">15</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_turnleft">' + '<value name="DEGREES">' + '<shadow type="math_number">' + '<field name="NUM">15</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_pointindirection">' + '<value name="DIRECTION">' + '<shadow type="math_angle">' + '<field name="NUM">90</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_pointtowards">' + '<value name="TOWARDS">' + '<shadow type="motion_pointtowards_menu">' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_gotoxy">' + '<value name="X">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '<value name="Y">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_goto">' + '<value name="TO">' + '<shadow type="motion_goto_menu">' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_glidesecstoxy">' + '<value name="SECS">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '<value name="X">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '<value name="Y">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_changexby">' + '<value name="DX">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_setx">' + '<value name="X">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_changeyby">' + '<value name="DY">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_sety">' + '<value name="Y">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="motion_ifonedgebounce"></block>' + '<block type="motion_setrotationstyle">' + '<value name="STYLE">' + '<shadow type="motion_setrotationstyle_menu"></shadow>' + '</value>' + '</block>' + '<block type="motion_xposition"></block>' + '<block type="motion_yposition"></block>' + '<block type="motion_direction"></block>' + '</category>' + '<category name="' + Msg.LOOKS + '" colour="#9966FF" secondaryColour="#774DCB">' + '<block type="looks_sayforsecs">' + '<value name="MESSAGE">' + '<shadow type="text">' + '<field name="TEXT">Hello!</field>' + '</shadow>' + '</value>' + '<value name="SECS">' + '<shadow type="math_number">' + '<field name="NUM">2</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_say">' + '<value name="MESSAGE">' + '<shadow type="text">' + '<field name="TEXT">Hello!</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_thinkforsecs">' + '<value name="MESSAGE">' + '<shadow type="text">' + '<field name="TEXT">Hmm...</field>' + '</shadow>' + '</value>' + '<value name="SECS">' + '<shadow type="math_number">' + '<field name="NUM">2</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_think">' + '<value name="MESSAGE">' + '<shadow type="text">' + '<field name="TEXT">Hmm...</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_show"></block>' + '<block type="looks_hide"></block>' + '<block type="looks_switchcostumeto">' + '<value name="COSTUME">' + '<shadow type="looks_costume"></shadow>' + '</value>' + '</block>' + '<block type="looks_nextcostume"></block>' + '<block type="looks_nextbackdrop"></block>' + '<block type="looks_switchbackdropto">' + '<value name="BACKDROP">' + '<shadow type="looks_backdrops"></shadow>' + '</value>' + '</block>' + '<block type="looks_switchbackdroptoandwait">' + '<value name="BACKDROP">' + '<shadow type="looks_backdrops"></shadow>' + '</value>' + '</block>' + '<block type="looks_changeeffectby">' + '<value name="EFFECT">' + '<shadow type="looks_effectmenu"></shadow>' + '</value>' + '<value name="CHANGE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_seteffectto">' + '<value name="EFFECT">' + '<shadow type="looks_effectmenu"></shadow>' + '</value>' + '<value name="VALUE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_cleargraphiceffects"></block>' + '<block type="looks_changesizeby">' + '<value name="CHANGE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_setsizeto">' + '<value name="SIZE">' + '<shadow type="math_number">' + '<field name="NUM">100</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_gotofront"></block>' + '<block type="looks_gobacklayers">' + '<value name="NUM">' + '<shadow type="math_integer">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="looks_costumeorder"></block>' + '<block type="looks_backdroporder"></block>' + '<block type="looks_backdropname"></block>' + '<block type="looks_size"></block>' + '</category>' + '<category name="' + Msg.SOUND + '" colour="#D65CD6" secondaryColour="#BD42BD">' + '<block type="sound_play">' + '<value name="SOUND_MENU">' + '<shadow type="sound_sounds_option"></shadow>' + '</value>' + '</block>' + '<block type="sound_playuntildone">' + '<value name="SOUND_MENU">' + '<shadow type="sound_sounds_option"></shadow>' + '</value>' + '</block>' + '<block type="sound_stopallsounds"></block>' + '<block type="sound_playdrumforbeats">' + '<value name="DRUMTYPE">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '<value name="BEATS">' + '<shadow type="math_number">' + '<field name="NUM">0.25</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_restforbeats">' + '<value name="BEATS">' + '<shadow type="math_number">' + '<field name="NUM">0.25</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_playnoteforbeats">' + '<value name="NOTE">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '<value name="BEATS">' + '<shadow type="math_number">' + '<field name="NUM">0.5</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_setinstrumentto">' + '<value name="INSTRUMENT">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_seteffectto">' + '<value name="EFFECT">' + '<shadow type="sound_effects_menu"></shadow>' + '</value>' + '<value name="VALUE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_changeeffectby">' + '<value name="EFFECT">' + '<shadow type="sound_effects_menu"></shadow>' + '</value>' + '<value name="VALUE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_cleareffects"></block>' + '<block type="sound_changevolumeby">' + '<value name="VOLUME">' + '<shadow type="math_number">' + '<field name="NUM">-10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_setvolumeto">' + '<value name="VOLUME">' + '<shadow type="math_number">' + '<field name="NUM">100</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_volume"></block>' + '<block type="sound_changetempoby">' + '<value name="TEMPO">' + '<shadow type="math_number">' + '<field name="NUM">20</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_settempotobpm">' + '<value name="TEMPO">' + '<shadow type="math_number">' + '<field name="NUM">60</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sound_tempo"></block>' + '</category>' + '<category name="' + Msg.PEN + '" colour="#00B295" secondaryColour="#0B8E69">' + '<block type="pen_clear"></block>' + '<block type="pen_stamp"></block>' + '<block type="pen_pendown"></block>' + '<block type="pen_penup"></block>' + '<block type="pen_setpencolortocolor">' + '<value name="COLOR">' + '<shadow type="colour_picker">' + '</shadow>' + '</value>' + '</block>' + '<block type="pen_changepencolorby">' + '<value name="COLOR">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="pen_setpencolortonum">' + '<value name="COLOR">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="pen_changepenshadeby">' + '<value name="SHADE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="pen_setpenshadeto">' + '<value name="SHADE">' + '<shadow type="math_number">' + '<field name="NUM">50</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="pen_changepensizeby">' + '<value name="SIZE">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="pen_setpensizeto">' + '<value name="SIZE">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '</block>' + '</category>' + '<category name="' + Msg.DATA + '" colour="#FF8C1A" secondaryColour="#DB6E00" custom="VARIABLE">' + '</category>' + '<category name="' + Msg.LIST + '" colour="#FF8C1A" secondaryColour="#DB6E00">' + '<block type="data_listcontents"></block>' + '<block type="data_addtolist">' + '<value name="ITEM">' + '<shadow type="text">' + '<field name="TEXT">thing</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="data_deleteoflist">' + '<value name="INDEX">' + '<shadow type="data_listindexall">' + '<field name="INDEX">1</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="data_insertatlist">' + '<value name="INDEX">' + '<shadow type="data_listindexrandom">' + '<field name="INDEX">1</field>' + '</shadow>' + '</value>' + '<value name="ITEM">' + '<shadow type="text">' + '<field name="TEXT">thing</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="data_replaceitemoflist">' + '<value name="INDEX">' + '<shadow type="data_listindexrandom">' + '<field name="INDEX">1</field>' + '</shadow>' + '</value>' + '<value name="ITEM">' + '<shadow type="text">' + '<field name="TEXT">thing</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="data_itemoflist">' + '<value name="INDEX">' + '<shadow type="data_listindexrandom">' + '<field name="INDEX">1</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="data_lengthoflist"></block>' + '<block type="data_listcontainsitem">' + '<value name="ITEM">' + '<shadow type="text">' + '<field name="TEXT">thing</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="data_showlist"></block>' + '<block type="data_hidelist"></block>' + '</category>' + '<category name="' + Msg.EVENTS + '" colour="#FFD500" secondaryColour="#CC9900">' + '<block type="event_whenflagclicked"></block>' + '<block type="event_whenkeypressed">' + '</block>' + '<block type="event_whenthisspriteclicked"></block>' + '<block type="event_whenbackdropswitchesto">' + '</block>' + '<block type="event_whengreaterthan">' + '<value name="VALUE">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="event_whenbroadcastreceived">' + '</block>' + '<block type="event_broadcast">' + '<value name="BROADCAST_OPTION">' + '<shadow type="event_broadcast_menu"></shadow>' + '</value>' + '</block>' + '<block type="event_broadcastandwait">' + '<value name="BROADCAST_OPTION">' + '<shadow type="event_broadcast_menu"></shadow>' + '</value>' + '</block>' + '</category>' + '<category name="' + Msg.CONTROL + '" colour="#FFAB19" secondaryColour="#CF8B17">' + '<block type="control_wait">' + '<value name="DURATION">' + '<shadow type="math_positive_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="control_repeat">' + '<value name="TIMES">' + '<shadow type="math_whole_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="control_forever"></block>' + '<block type="control_if"></block>' + '<block type="control_if_else"></block>' + '<block type="control_wait_until"></block>' + '<block type="control_repeat_until"></block>' + '<block type="control_stop"></block>' + '<block type="control_start_as_clone"></block>' + '<block type="control_create_clone_of">' + '<value name="CLONE_OPTION">' + '<shadow type="control_create_clone_of_menu"></shadow>' + '</value>' + '</block>' + '<block type="control_delete_this_clone"></block>' + '</category>' + '<category name="' + Msg.SENSING + '" colour="#4CBFE6" secondaryColour="#2E8EB8">' + '<block type="sensing_touchingobject">' + '<value name="TOUCHINGOBJECTMENU">' + '<shadow type="sensing_touchingobjectmenu"></shadow>' + '</value>' + '</block>' + '<block type="sensing_touchingcolor">' + '<value name="COLOR">' + '<shadow type="colour_picker"></shadow>' + '</value>' + '</block>' + '<block type="sensing_coloristouchingcolor">' + '<value name="COLOR">' + '<shadow type="colour_picker"></shadow>' + '</value>' + '<value name="COLOR2">' + '<shadow type="colour_picker"></shadow>' + '</value>' + '</block>' + '<block type="sensing_distanceto">' + '<value name="DISTANCETOMENU">' + '<shadow type="sensing_distancetomenu"></shadow>' + '</value>' + '</block>' + '<block type="sensing_askandwait">' + '<value name="QUESTION">' + '<shadow type="text">' + '<field name="TEXT">What\'s your name?</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sensing_answer"></block>' + '<block type="sensing_keypressed">' + '<value name="KEY_OPTION">' + '<shadow type="sensing_keyoptions"></shadow>' + '</value>' + '</block>' + '<block type="sensing_mousedown"></block>' + '<block type="sensing_mousex"></block>' + '<block type="sensing_mousey"></block>' + '<block type="sensing_loudness"></block>' + '<block type="sensing_videoon">' + '<value name="VIDEOONMENU1">' + '<shadow type="sensing_videoonmenuone"></shadow>' + '</value>' + '<value name="VIDEOONMENU2">' + '<shadow type="sensing_videoonmenutwo"></shadow>' + '</value>' + '</block>' + '<block type="sensing_videotoggle">' + '<value name="VIDEOTOGGLEMENU">' + '<shadow type="sensing_videotogglemenu"></shadow>' + '</value>' + '</block>' + '<block type="sensing_setvideotransparency">' + '<value name="TRANSPARENCY">' + '<shadow type="math_number">' + '<field name="NUM">50</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="sensing_timer"></block>' + '<block type="sensing_resettimer"></block>' + '<block type="sensing_of">' + '<value name="PROPERTY">' + '<shadow type="sensing_of_property_menu"></shadow>' + '</value>' + '<value name="OBJECT">' + '<shadow type="sensing_of_object_menu"></shadow>' + '</value>' + '</block>' + '<block type="sensing_current">' + '<value name="CURRENTMENU">' + '<shadow type="sensing_currentmenu"></shadow>' + '</value>' + '</block>' + '<block type="sensing_dayssince2000"></block>' + '<block type="sensing_username"></block>' + '</category>' + '<category name="' + Msg.OPERATORS + '" colour="#40BF4A" secondaryColour="#389438">' + '<block type="operator_add">' + '<value name="NUM1">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '<value name="NUM2">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_subtract">' + '<value name="NUM1">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '<value name="NUM2">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_multiply">' + '<value name="NUM1">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '<value name="NUM2">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_divide">' + '<value name="NUM1">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '<value name="NUM2">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_random">' + '<value name="FROM">' + '<shadow type="math_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '<value name="TO">' + '<shadow type="math_number">' + '<field name="NUM">10</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_lt">' + '<value name="OPERAND1">' + '<shadow type="text">' + '<field name="TEXT"></field>' + '</shadow>' + '</value>' + '<value name="OPERAND2">' + '<shadow type="text">' + '<field name="TEXT"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_equals">' + '<value name="OPERAND1">' + '<shadow type="text">' + '<field name="TEXT"></field>' + '</shadow>' + '</value>' + '<value name="OPERAND2">' + '<shadow type="text">' + '<field name="TEXT"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_gt">' + '<value name="OPERAND1">' + '<shadow type="text">' + '<field name="TEXT"></field>' + '</shadow>' + '</value>' + '<value name="OPERAND2">' + '<shadow type="text">' + '<field name="TEXT"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_and"></block>' + '<block type="operator_or"></block>' + '<block type="operator_not"></block>' + '<block type="operator_join">' + '<value name="STRING1">' + '<shadow type="text">' + '<field name="TEXT">hello</field>' + '</shadow>' + '</value>' + '<value name="STRING2">' + '<shadow type="text">' + '<field name="TEXT">world</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_letter_of">' + '<value name="LETTER">' + '<shadow type="math_whole_number">' + '<field name="NUM">1</field>' + '</shadow>' + '</value>' + '<value name="STRING">' + '<shadow type="text">' + '<field name="TEXT">world</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_length">' + '<value name="STRING">' + '<shadow type="text">' + '<field name="TEXT">world</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_mod">' + '<value name="NUM1">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '<value name="NUM2">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_round">' + '<value name="NUM">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '<block type="operator_mathop">' + '<value name="OPERATOR">' + '<shadow type="operator_mathop_menu"></shadow>' + '</value>' + '<value name="NUM">' + '<shadow type="math_number">' + '<field name="NUM"></field>' + '</shadow>' + '</value>' + '</block>' + '</category>' + '<category name="Arduino" colour="#00979C" secondaryColour="#008184">' + '<block type="event_arduinobegin"></block>' + '<block type="arduino_pin_mode">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">3</field>' + '</shadow>' + '</value>' + '<value name="ARDUINO_PIN_MODE_OPTION">' + '<shadow type="arduino_pin_mode_option"></shadow>' + '</value>' + '</block>' + '<block type="arduino_digital_write">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">3</field>' + '</shadow>' + '</value>' + '<value name="ARDUINO_LEVEL_OPTION">' + '<shadow type="arduino_level_option"></shadow>' + '</value>' + '</block>' + '<block type="arduino_pwm_write">' + '<value name="ARDUINO_PWM_OPTION">' + '<shadow type="arduino_pwm_option">' + '<field name="ARDUINO_PWM_OPTION">3</field>' + '</shadow>' + '</value>' + '<value name="PWM">' + '<shadow type="math_number">' + '<field name="NUM">100</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_digital_read">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">3</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_analog_read">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">A3</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_tone">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">3</field>' + '</shadow>' + '</value>' + '<value name="FREQUENCY">' + '<shadow type="math_number">' + '<field name="NUM">200</field>' + '</shadow>' + '</value>' + '<value name="DURATION">' + '<shadow type="math_number">' + '<field name="NUM">500</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_servo">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">3</field>' + '</shadow>' + '</value>' + '<value name="ANGLE">' + '<shadow type="math_angle">' + '<field name="NUM">90</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_map">' + '<value name="VAL">' + '<shadow type="math_number">' + '<field name="NUM">512</field>' + '</shadow>' + '</value>' + '<value name="FROMLOW">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '<value name="FROMHIGH">' + '<shadow type="math_number">' + '<field name="NUM">1024</field>' + '</shadow>' + '</value>' + '<value name="TOLOW">' + '<shadow type="math_number">' + '<field name="NUM">0</field>' + '</shadow>' + '</value>' + '<value name="TOHIGH">' + '<shadow type="math_number">' + '<field name="NUM">255</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_pulsein">' + '<value name="PINNUM">' + '<shadow type="text">' + '<field name="TEXT">8</field>' + '</shadow>' + '</value>' + '</block>' + '<block type="arduino_println">' + '<value name="TEXT">' + '<shadow type="text">' + '<field name="TEXT">Hello world!</field>' + '</shadow>' + '</value>' + '</block>' + '</category>' + '</xml>';
	    return ret;
	};

	module.exports = Toolbox;

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	/**
	 * Created by Riven on 2016/12/15.
	 */

	var fs = __webpack_require__(5);
	var http = __webpack_require__(4);
	var url = __webpack_require__(28);
	var crypt = __webpack_require__(29);

	var ResourceServer = function ResourceServer() {
	    this._server = null;
	};

	module.exports = ResourceServer;

	ResourceServer.prototype.getSpriteSkin = function (spriteId) {
	    var targets = window.vm.runtime.targets;
	    for (var i = 0; i < targets.length; i++) {
	        var ele = targets[i];
	        if (ele.id == spriteId) {
	            var skin = ele.sprite.costumes[0].skin;
	            return skin;
	        }
	    }
	    return "";
	};

	ResourceServer.prototype.startServer = function (workspacePath) {
	    this._server = http.createServer(function (req, res) {
	        var request = url.parse(req.url, true);
	        var action = request.pathname;
	        //console.log("server: " + action);

	        if (action.indexOf("png") > -1) {
	            var img = fs.readFileSync(workspacePath + action.substr(1)); // remove slash
	            res.writeHead(200, { 'Content-Type': 'image/png' });
	            res.end(img, 'binary');
	        } else if (action.indexOf("svg") > -1) {
	            var img = fs.readFileSync(workspacePath + action.substr(1)); // remove slash
	            res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
	            res.end(img, 'binary');
	        } else {
	            res.writeHead(200, { 'Content-Type': 'text/plain' });
	            res.end('Hello World \n');
	        }
	    });

	    this._server.on("clientError", function (err, socket) {
	        console.log("client error " + err);
	        socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
	    });

	    this._server.on('listening', function () {
	        console.log('resource server is running');
	    });

	    this._server.listen(9234);
	};

/***/ },
/* 28 */
/***/ function(module, exports) {

	module.exports = require("url");

/***/ },
/* 29 */
/***/ function(module, exports) {

	module.exports = require("crypto");

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Created by Riven on 2016/12/16.
	 */
	"use strict";

	var fs = __webpack_require__(5);

	var ConfigManager = function ConfigManager() {
	    this.configFile = process.cwd() + "/kittenblock.json";
	};

	ConfigManager.prototype.load = function () {
	    var s = fs.readFileSync(this.configFile, 'utf8');
	    return JSON.parse(s);
	};

	module.exports = ConfigManager;

/***/ }
/******/ ]);