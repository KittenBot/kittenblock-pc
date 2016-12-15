/**
 * Created by Riven on 2016/12/16.
 */

var ConfigManager = require('../src/ConfigManager');
var cfg = new ConfigManager();
cfg.load();
console.log(cfg.config);


