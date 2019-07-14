/*
    Copyright (c) 2019 Neil Stansbury <neil@neilstansbury.com>
    This work is free. You can redistribute it and/or modify it
    under the terms of the WTFPL, Version 2
    For more information see http://www.wtfpl.net

    Flatpack :: Package your web app as a single downloadable package
                and dynamically unpack and serve with ServiceWorkers

    For more information, the home page: http://flatpackapp.com
*/

var fs = require('fs');
var path = require('path');
var mime = require('mime-types')
var Flatpack = require('./flatpacklib.js');

//=> Promise<ArrayBuffer> readFile(DOMString target);
function readFile(target){
    return new Promise(function(resolve, reject){
        fs.readFile(target, function(err, data){
            err === null ? resolve(data) : reject(err);
        });
    });
};


//=> Promise<object> readStats(DOMString target);
function readStats(target){
    return new Promise(function(resolve, reject){
        fs.stat(target, function(err, data){
            err === null ? resolve(data) : reject(err);
        });
    });
}

//=> Promise<> writeFile(DOMString target, ArrayBuffer data);
function writeFile(target, data){
    return new Promise(function(resolve, reject){
        fs.writeFile(target, data, function(err){
            err === null ? resolve() : reject(err);
        });
    });
}


//=> DOMString resolvePath(...paths);
function resolvePath(){
    return path.resolve.apply(null, arguments);
};

//=> Promise<Sequence<DOMString>> readDir(DOMString target);
function readDir(target){
    return new Promise(function(resolve, reject){
        fs.readdir(target, function(err, items) {
            err === null ? resolve(items) : reject(err);
        });
    });
};


//=> Promise<> pack(DOMString src, DOMString dest);
function pack(src, dest){
    var dist = resolvePath(BASE_PATH, src);
    var readSrc = readDir(dist);
    var readFiles = readSrc.then((files) => {
        var readers = [];
        for(let fileName of files){
            let target = resolvePath(dist, fileName);
            let reader = readFile(target);
            let stat = readStats(target);
            let getFile = Promise.all([reader, stat]);
            var getTarget = getFile.then((file) => {
                let [buffer, stats] = file;
                var contentType = mime.lookup(target) || DEFAULT_CONTENT_TYPE;
                return {
                    name : fileName,
                    buffer : buffer,
                    type : contentType,
                    modified : stats.mtime
                }
            });
            readers.push(getTarget);
        }
        return Promise.all(readers);
    });

    return readFiles.then((targets) => {
        return Flatpack.pack(targets, dest).then((app) => {
            console.log('Flatpack :: App package written to ' +dest);
            return writeFile(dest, app).then(() => app);
        },(e) => console.error('Flatpack :: ' +e));
    });
}


//=> Promise<> pack(DOMString src, DOMString target, DOMString dest);
function unpack(src, target, dest){
    var readPackage = readFile(src);
    readPackage.then((app) => {
        return Flatpack.unpack(app, target).then((data) => {
            if(data){
                console.log('Flatpack :: App package unpacked to ' +dest);
                return writeFile(dest, data);
            }
            else {
                console.log('Flatpack :: Target not found - ' +target);
            }
        }, (e) => console.error('Flatpack :: ' +e));
    });
}


const BASE_PATH = process.cwd();
const DEFAULT_CONTENT_TYPE = 'application/octet-stream';

// flatpack --pack ./dist --dest flatpack.app
// flatpack --unpack flatpack.app --file member --dest ./dist

var config = {
    has(arg){
        return this['--' +arg].param !== null ? true : false;
    },
    get(arg){
        return this['--' +arg].param || this['--' +arg].default;
    },
    '--pack' : {
        default : BASE_PATH,
        param : null
    },
    '--unpack' : {
        default : resolvePath(BASE_PATH, 'flatpack.app'),
        param : null
    },
    '--dest' : {
        default : BASE_PATH,
        param : null
    },
    '--file' : {
        default : '',
        param : null
    }
}


var argv = process.argv.slice(2);
var args = {};
var curr;

for(let arg of argv){
    if(arg.startsWith('--')){
        if(config[arg]){
            curr = arg;
            config[curr].param = true;
        }
    }
    else if(curr) {
        config[curr].param = arg;
    }
}

if(config.has('pack')){
    var src = config.get('pack');
    var dest = config.get('dest');
    pack(src, dest);
}
else if(config.has('unpack')){
    var src = config.get('unpack');
    if(config.has('file')){
        var target = config.get('file');
    }
    if(config.has('dest')) {
        var dest = config.get('dest');
    }
    else {
        var dest = target;
    }
    unpack(src, target, dest);
}
