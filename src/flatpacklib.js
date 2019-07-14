/*
    Copyright (c) 2019 Neil Stansbury <neil@neilstansbury.com>
    This work is free. You can redistribute it and/or modify it
    under the terms of the WTFPL, Version 2
    For more information see http://www.wtfpl.net

    Flatpack :: Package your web app as a single downloadable package
                and dynamically unpack and serve with ServiceWorkers

    For more information, the home page: http://flatpackapp.com
*/

import LZString from './lz-string.js';

//=> boolean isStringType(DOMString contentType);
function isStringType(contentType){
    var stringTypes = ['text/plain', 'application/javascript', 'text/html', 'text/css', 'application/json',
    'application/ld+json','application/manifest+json', 'image/svg+xml'];

    return stringTypes.includes(contentType);
};

//=> ByteArray longToByteArray(number long);
function longToByteArray(long){
    var byteArray = new Uint8Array(8);

    for (var index = 0; index < byteArray.length; index++){
        var byte = long & 0xff;
        byteArray [index] = byte;
        long = (long - byte) / 256 ;
    }
    return byteArray;
};


//=> number byteArrayToLong(ByteArray byteArray);
function byteArrayToLong(byteArray) {
    var value = 0;
    for (var i = byteArray.length - 1; i >= 0; i--){
        value = (value * 256) + byteArray[i];
    }
    return value;
};


//=> ByteArray stringToByteArray(DOMString string);
function stringToByteArray(string){
    var byteArray = new Uint8Array(string.length);
    for(var i = 0; i < string.length; i++){
        byteArray[i] = string[i].charCodeAt(0);
    }
    return byteArray;
};


//=> DOMString byteArrayToString(ByteArray byteArray, number offset, number length);
function byteArrayToString(byteArray, offset, length){
    var string = '';
    offset = offset || 0;
    length = offset +length || byteArray.length
    for(var i = offset; i < length; i++){
        var char = byteArray[i];
        if (char === 0){
            break;
        }
        string += String.fromCharCode(char);
    }
    return string;
};




//=> Promise<ArrayBuffer> pack(sequence<PackageTarget> targets, DOMString dest);
function pack(targets, dest){

    return new Promise((resolve, reject) => {
        var index = {};
        var app = new Uint8Array(0);
        var offset = 0;
        for(let target of targets){
            if(isStringType(target.type)){
                var string = byteArrayToString(target.buffer);
                var buffer = LZString.compressToUint8Array(string);
            }
            else {
                var buffer = target.buffer;
            }

            index[target.name] = {
                type : target.type,
                size : buffer.length,
                offset : offset
            }

            app = Buffer.concat([app, buffer]);
            offset += buffer.length;
        }

        var json = JSON.stringify(index);

        var descriptors = stringToByteArray(json);
        var header = longToByteArray(descriptors.length);
        var length = byteArrayToLong(header);

        if(json.length !== descriptors.length || json.length !== length){
            return Promise.reject('Flatpack :: Descriptor byte length doesnt match');
        }

        var app = Buffer.concat([header, descriptors, app]);
        resolve(app);
    });
};


//=> Promise<ByteArray> unpack(ByteArray app, DOMString target);
function unpack(app, target){

    return new Promise((resolve, reject) => {
        const HEADER_LENGTH = 8;

        var header = new Uint8Array(HEADER_LENGTH);
        for(var i = 0; i < HEADER_LENGTH; i++){
            header[i] = app[i];
        }

        var length = byteArrayToLong(header);

        var descriptors = new Uint8Array(length);
        for(var i = HEADER_LENGTH; i < length +HEADER_LENGTH; i++){
            descriptors[i -HEADER_LENGTH] = app[i];
        }

        var json = byteArrayToString(descriptors);
        var index = JSON.parse(json);
        var offset = HEADER_LENGTH +descriptors.length;

        if(target){
            resolve(getTarget(index[target], app, offset));
        }
        else {
            resolve(index);
        }
    });

};


//=> Promise<ByteArray> getTarget(object target, ByteArray app, number base);
function getTarget(target, app, base){
    if(target){
        var offset = base +target.offset;
        var byteArray = app.slice(offset, offset +target.size);
        if(isStringType(target.type)){
            var string = LZString.decompressFromUint8Array(byteArray);
            var byteArray = stringToByteArray(string);
        }
        return Promise.resolve(byteArray);
    }
    return Promise.resolve(null);
}

export {pack, unpack};
