/*
    Copyright (c) 2019 Neil Stansbury <neil@neilstansbury.com>
    This work is free. You can redistribute it and/or modify it
    under the terms of the WTFPL, Version 2
    For more information see http://www.wtfpl.net

    Flatpack :: Package your web app as a single downloadable package
                and dynamically unpack and serve with ServiceWorkers

    For more information, the home page: http://flatpackapp.com
*/

var Packages = {};
var reloaded = false;

//=> void oncontrollerchange(Event event);
function oncontrollerchange(event){
    if(reloaded) return;
    reloaded = true;
    window.location.reload();
}


//=> void onupdatefound(Event event);
function onupdatefound(event){
    console.info('FlatPack :: Package update found');
    var event = new CustomEvent('updatefound', {detail : event.target, bubbles : true});
    document.dispatchEvent(event);
}


//=> Promise<> serve();
function serve(){
    var link = document.querySelector('link[data-scope]');
    if(!link){
        var e = 'FlatPack :: No app packages found';
        console.warn(e);
        return Promise.reject(e);
    }

    var app = link.getAttribute('data-scope');
    var scope = new URL(app, document.location.origin).href;
    var path = link.href;

    if(!scope || !path){
        var e = 'FlatPack :: App package config missing';
        console.error(e);
        return Promise.reject(e);
    }

    if(window.caches){
        var addCache = caches.open(scope).then((cache) => {
            return cache.add(path);
        },() => {
            var e = 'Flatpack :: failed to update cache';
            console.error(e);
            return Promise.reject(e);
        });

        return addCache.then(() => {
            navigator.serviceWorker.addEventListener('controllerchange', oncontrollerchange);
            var registerWorker = navigator.serviceWorker.register('./flatpack.app.js', {scope:scope});
            return registerWorker.then((registration) => {
                Packages[scope] = registration;
                registration.addEventListener('onupdatefound', onupdatefound);
                console.info('FlatPack :: Registered app service for:', scope);
            });
        });
    }
    else {
        var e = 'Flatpack :: App service is unsupported';
        console.warn(e);
        return Promise.reject(e);
    }
};


//=> Promise<> update(DOMString scope);
function update(scope){
    if(Packages[scope]){
        return Packages[scope].update();
    }
    else {
        return Promise.reject('Flatpack :: Cannot update scope - not found');
    }
}


//=> Promise<> unregister(DOMString scope);
function unregister(scope){
    if(Packages[scope]){
        return Packages[scope].unregister();
    }
    else {
        return Promise.reject('Flatpack :: Cannot unregister scope - not found');
    }
}



if(typeof window !== 'undefined'){
    window.addEventListener("load", () => serve());
}


var Flatpack = {serve, update, unregister};
export default Flatpack;
