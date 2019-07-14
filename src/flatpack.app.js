/*
    Copyright (c) 2019 Neil Stansbury <neil@neilstansbury.com>
    This work is free. You can redistribute it and/or modify it
    under the terms of the WTFPL, Version 2
    For more information see http://www.wtfpl.net

    Flatpack :: Package your web app as a single downloadable package
                and dynamically unpack and serve with ServiceWorkers

    For more information, the home page: http://flatpackapp.com
*/

import * as Flatpack from '/flatpacklib.js';

self.addEventListener('install', function(event){
    console.info('Flatpack :: Installing app service at:', self.registration.scope);
});

self.addEventListener('activate', function(event){
    self.clients.claim();
    console.log('Flatpack :: Activating app service at:', self.registration.scope);
});

self.addEventListener('message', function(event){
  if (event.data === 'skipWaiting') return skipWaiting();
});


self.addEventListener('fetch', function(event){
    var url = event.request.url;
    var scope = new URL(self.registration.scope, self.location.origin).href;

    if(!url.startsWith(scope)){
        return;
    }

    var target = url.replace(scope, '');
    console.info('Flatpack :: Unpacking', target, 'from', scope);

    var openCache = caches.open(scope);
    var getResponse = openCache.then((cache) => {
        var getRequest = cache.keys().then((requests) => requests[0]);
        return getRequest.then((request) => {
            return cache.match(request);
        });
    });
    var getTarget = getResponse.then((response) => {
        var getBuffer = response.arrayBuffer();
        var unpackTarget = getBuffer.then((arrayBuffer) => {
            var byteArray = new Uint8Array(arrayBuffer);
            return Flatpack.unpack(byteArray, target);
        });
        return unpackTarget.then((byteArray) => {
            if(byteArray){
                var init = { 'status' : 200 , 'statusText' : 'OK' }
                return new Response(byteArray, init);
            }
            return Promise.reject('Flatpack :: File not found in package: ' +target);
        }).catch((e) => {
            console.warn(e);
            return fetch(target).then((response) => response);
        });
    });

    event.respondWith(getTarget);
});
