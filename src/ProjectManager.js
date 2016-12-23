/**
 * Created by Riven on 2016/12/17.
 */
var fs = require("fs");
var path = require('path');
var crypt = require('crypto');
var admzip = require("adm-zip");

function renameByMd5(folder, filepath, ext){
    var img = fs.readFileSync(filepath);
    var md5 = crypt.createHash('md5');
    md5.update(img, 'utf8');
    var md5str = md5.digest('hex');
    var newFilepath = folder+"/"+md5str+ext;
    fs.rename(filepath,newFilepath, function(err) {
        if ( err ) console.log('ERROR: ' + err);
    });
}

var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

var ProjectManager = function(workspace){
    this.workspaceFolder = workspace;

};

ProjectManager.prototype.clearWorkspaceFolder = function(){
    deleteFolderRecursive(this.workspaceFolder);
};

ProjectManager.prototype.parseExamples = function (exampleFolder) {
    var exampleList = [];
    var tmplist = fs.readdirSync(exampleFolder);
    tmplist.forEach(function (p) {
        var filepath = path.resolve(exampleFolder,p)
        if(path.extname(filepath)==".sb2") {
            var basename = path.basename(filepath, '.sb2');
            var pngfile = path.resolve(exampleFolder,basename+".png");
            var example = {"name":basename,"img":pngfile,"sb2":filepath}
            exampleList.push(example);
        }
    });
    return exampleList;
};

ProjectManager.prototype.renameResourceToHash = function(folder){
    var tmplist = fs.readdirSync(folder);
    tmplist.forEach(function (p) {
        var filepath = path.resolve(folder,p);
        if(path.extname(filepath)==".png" || path.extname(filepath)==".svg") {
            renameByMd5(folder, filepath, path.extname(filepath));
        }
    });
};

/**
 * load sb2 format project file
 * @param filepath
 */
ProjectManager.prototype.loadsb2 = function(filepath){
    //window.vm.createEmptyProject();
    this.clearWorkspaceFolder();
    var projName = path.basename(filepath, '.sb2');
    // 1. extract sb2 file to workspace
    var zip = new admzip(filepath);
    var zipEntries = zip.getEntries();
    zip.extractAllTo(this.workspaceFolder,true);
    // 2. rename resources

    this.renameResourceToHash(this.workspaceFolder);
    // 3. load project
    var projectJson = path.resolve(this.workspaceFolder,"project.json");
    var s = fs.readFileSync(projectJson, 'utf8');
    window.vm.loadProject(s);

    return projName;
};

ProjectManager.prototype.loadkb = function (filepath) {
    var projName = path.basename(filepath, '.kb');
    // 1. extract sb2 file to workspace
    var xml = fs.readFileSync(filepath, 'utf8');
    var obj = {"name":projName,"xml":xml};
    return obj;
};

ProjectManager.prototype.savekb = function (filepath,xml) {
    var s = fs.writeFileSync(filepath, xml);
    return s;
};


module.exports = ProjectManager;
