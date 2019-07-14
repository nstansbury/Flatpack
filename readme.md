Flatpack your web app
=====================
Package your web app as a single downloadable app package and dynamically unpack and serve with ServiceWorkers
for online and offline app caching.  Flatpack compresses string content-types (.js/.html/.css/.svg etc) and stores
other content-types in binary format.


The command line
-----------------

Create an app package

	"node ./build/cli/flatpack.js --pack ./src --dest ./build/package.app"

Unpack a single target file from the app package

	"node ./build/cli/flatpack.js --unpack ./build/package.app --file targetFile --dest ./build/targetFile



The browser
-----------
Place this is the head of your HTML file

	<link data-scope="/package/" href="../build/package.app">
	<script src="./build/browser/flatpack.js" type="text/javascript"></script>

Flatpack will install a ServiceWorker and cache the specified app package.

When the browser makes a request to any url that matches the scope of the package, Flatpack will uncompress the requested file
from the package and return it to the browser.

If Flatpack cannot find the file in the app package it will request it from the network.
