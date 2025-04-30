const cacheName = 'your-cache-name-v9'; // Replace with your cache name and version

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.open(cacheName).then(cache => {
            return cache.match(event.request).then(response => {
                if (response) {
                    return response; // Return cached response if found
                }

                return fetch(event.request).then(networkResponse => {
                    if (networkResponse.status === 200) { // Only cache 200 responses
                        cache.put(event.request, networkResponse.clone());
                        console.log("Cached:", event.request.url); // Add logging
                    } else {
                        console.warn(`Response with status ${networkResponse.status} not cached: ${event.request.url}`);
                    }
                    return networkResponse.clone(); // Return network response
                }).catch(error => {
                   console.error("Fetch error:", error, event.request.url);
                   throw error; // Propagate the error
                });
            });
        })
    );
});

// Example of excluding specific file types or URL patterns:


self.addEventListener("fetch", event => {
    const url = event.request.url;

    if (url.includes('.mp4') || url.includes('.mp3') || url.includes('.zip')) {
        console.log("Bypassing cache for:", url);
        event.respondWith(fetch(event.request)); // Bypass cache for these types
        return;
    }

    event.respondWith(
        caches.open(cacheName).then(cache => {
            return cache.match(event.request).then(response => {
                if (response) {
                    return response;
                }

                return fetch(event.request).then(networkResponse => {
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                        console.log("Cached:", event.request.url);
                    } else {
                         console.warn(`Response with status ${networkResponse.status} not cached: ${event.request.url}`);
                    }
                    return networkResponse.clone();
                }).catch(error =>{
                    console.error("Fetch error:", error, event.request.url);
                    throw error;
                });
            });
        })
    );
});


// Example of adding an install event.

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(cacheName).then((cache) => {
            console.log('Service Worker: Caching Files');
            return cache.addAll([
                '/', // Add files you want to cache here
                "index.html",
                "studio.html",
                "pooja.html",
                "settings.html",
                "nfc.html",
                "nfc.html",
				"main.js",
				"style.css",
				"manifest.json",
				"favicon.ico",
				"sw.js",
				"android-chrome-36x36.png",
				"android-chrome-48x48.png",
				"android-chrome-72x72.png",
				"android-chrome-96x96.png",
				"android-chrome-144x144.png",
				"android-chrome-192x192.png",
				"android-chrome-256x256.png",
				"android-chrome-384x384.png",
				"android-chrome-512x512.png",
				"maskable_icon.png",
				"android-chrome-36x36.png", // Favicon, Android Chrome M39+ with 0.75 screen density
				"android-chrome-48x48.png", // Favicon, Android Chrome M39+ with 1.0 screen density
				"android-chrome-72x72.png", // Favicon, Android Chrome M39+ with 1.5 screen density
				"android-chrome-96x96.png", // Favicon, Android Chrome M39+ with 2.0 screen density
				"android-chrome-144x144.png", // Favicon, Android Chrome M39+ with 3.0 screen density
				"android-chrome-192x192.png", // Favicon, Android Chrome M39+ with 4.0 screen density
				"android-chrome-256x256.png", // Favicon, Android Chrome M47+ Splash screen with 1.5 screen density
				"android-chrome-384x384.png", // Favicon, Android Chrome M47+ Splash screen with 3.0 screen density
				"android-chrome-512x512.png", // Favicon, Android Chrome M47+ Splash screen with 4.0 screen density
				"apple-touch-icon.png", // Favicon, Apple default
				"apple-touch-icon-57x57.png", // Apple iPhone, Non-retina with iOS6 or prior
				"apple-touch-icon-60x60.png", // Apple iPhone, Non-retina with iOS7
				"apple-touch-icon-72x72.png", // Apple iPad, Non-retina with iOS6 or prior
				"apple-touch-icon-76x76.png", // Apple iPad, Non-retina with iOS7
				"apple-touch-icon-114x114.png", // Apple iPhone, Retina with iOS6 or prior
				"apple-touch-icon-120x120.png", // Apple iPhone, Retina with iOS7
				"apple-touch-icon-144x144.png", // Apple iPad, Retina with iOS6 or prior
				"apple-touch-icon-152x152.png", // Apple iPad, Retina with iOS7
				"apple-touch-icon-180x180.png", // Apple iPhone 6 Plus with iOS8
				"browserconfig.xml", // IE11 icon configuration file
				"favicon.ico", // Favicon, IE and fallback for other browsers
				"favicon-16x16.png", // Favicon, default
				"favicon-32x32.png", // Favicon, Safari on Mac OS
				"manifest.json", // Manifest file
				"maskable_icon.png", // Favicon, maskable https://web.dev/maskable-icon
				"mstile-70x70.png", // Favicon, Windows 8 / IE11
				"mstile-144x144.png", // Favicon, Windows 8 / IE10
				"mstile-150x150.png", // Favicon, Windows 8 / IE11
				"mstile-310x150.png", // Favicon, Windows 8 / IE11
				"mstile-310x310.png", // Favicon, Windows 8 / IE11
				"safari-pinned-tab.svg", // Favicon, Safari pinned tab
				"share.jpg", // Social media sharing
            ]);
        })
    );
});


self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.open(cacheName).then((cache) => {
            return cache.match(event.request).then((response) => {
                if (response) {
                    return response; // Return cached response
                }

                return fetch(event.request).then((networkResponse) => {
                    if (networkResponse.status === 200 && event.request.url.includes('/image/')) { //Cache images only
                        cache.put(event.request, networkResponse.clone());
                        console.log("Image Cached:", event.request.url);
                    } else {
                         console.warn(`Response with status ${networkResponse.status} not cached: ${event.request.url}`);
                    }
                    return networkResponse.clone();
                }).catch(error=>{
                    console.error("Fetch error:", error, event.request.url);
                    throw error;
                });
            });
        })
    );
});



// Example of adding an activate event.

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheToDel) => {
                    if (cacheToDel !== cacheName) {
                        console.log('Service Worker: Clearing Old Cache');
                        return caches.delete(cacheToDel);
                    }
                })
            );
        })
    );
});




// const cacheName = "cache1"; // Change value to force update

// self.addEventListener("install", event => {
// 	// Kick out the old service worker
// 	self.skipWaiting();

// 	event.waitUntil(
// 		caches.open(cacheName).then(cache => {
// 			return cache.addAll([
// 				"index.html",
// 				"main.js",
// 				"style.css",
// 				"manifest.json",
// 				"favicon.ico",
// 				"sw.js",
// 				"android-chrome-36x36.png",
// 				"android-chrome-48x48.png",
// 				"android-chrome-72x72.png",
// 				"android-chrome-96x96.png",
// 				"android-chrome-144x144.png",
// 				"android-chrome-192x192.png",
// 				"android-chrome-256x256.png",
// 				"android-chrome-384x384.png",
// 				"android-chrome-512x512.png",
// 				"maskable_icon.png",
// 				// "android-chrome-36x36.png", // Favicon, Android Chrome M39+ with 0.75 screen density
// 				// "android-chrome-48x48.png", // Favicon, Android Chrome M39+ with 1.0 screen density
// 				// "android-chrome-72x72.png", // Favicon, Android Chrome M39+ with 1.5 screen density
// 				// "android-chrome-96x96.png", // Favicon, Android Chrome M39+ with 2.0 screen density
// 				// "android-chrome-144x144.png", // Favicon, Android Chrome M39+ with 3.0 screen density
// 				// "android-chrome-192x192.png", // Favicon, Android Chrome M39+ with 4.0 screen density
// 				// "android-chrome-256x256.png", // Favicon, Android Chrome M47+ Splash screen with 1.5 screen density
// 				// "android-chrome-384x384.png", // Favicon, Android Chrome M47+ Splash screen with 3.0 screen density
// 				// "android-chrome-512x512.png", // Favicon, Android Chrome M47+ Splash screen with 4.0 screen density
// 				// "apple-touch-icon.png", // Favicon, Apple default
// 				// "apple-touch-icon-57x57.png", // Apple iPhone, Non-retina with iOS6 or prior
// 				// "apple-touch-icon-60x60.png", // Apple iPhone, Non-retina with iOS7
// 				// "apple-touch-icon-72x72.png", // Apple iPad, Non-retina with iOS6 or prior
// 				// "apple-touch-icon-76x76.png", // Apple iPad, Non-retina with iOS7
// 				// "apple-touch-icon-114x114.png", // Apple iPhone, Retina with iOS6 or prior
// 				// "apple-touch-icon-120x120.png", // Apple iPhone, Retina with iOS7
// 				// "apple-touch-icon-144x144.png", // Apple iPad, Retina with iOS6 or prior
// 				// "apple-touch-icon-152x152.png", // Apple iPad, Retina with iOS7
// 				// "apple-touch-icon-180x180.png", // Apple iPhone 6 Plus with iOS8
// 				// "browserconfig.xml", // IE11 icon configuration file
// 				// "favicon.ico", // Favicon, IE and fallback for other browsers
// 				// "favicon-16x16.png", // Favicon, default
// 				// "favicon-32x32.png", // Favicon, Safari on Mac OS
// 				// "index.html", // Main HTML file
// 				// "logo.png", // Logo
// 				// "main.js", // Main Javascript file
// 				// "manifest.json", // Manifest file
// 				// "maskable_icon.png", // Favicon, maskable https://web.dev/maskable-icon
// 				// "mstile-70x70.png", // Favicon, Windows 8 / IE11
// 				// "mstile-144x144.png", // Favicon, Windows 8 / IE10
// 				// "mstile-150x150.png", // Favicon, Windows 8 / IE11
// 				// "mstile-310x150.png", // Favicon, Windows 8 / IE11
// 				// "mstile-310x310.png", // Favicon, Windows 8 / IE11
// 				// "safari-pinned-tab.svg", // Favicon, Safari pinned tab
// 				// "share.jpg", // Social media sharing
// 				// "style.css", // Main CSS file
// 			]);
// 		})
// 	);
// });

// self.addEventListener("activate", event => {
// 	// Delete any non-current cache
// 	event.waitUntil(
// 		caches.keys().then(keys => {
// 			Promise.all(
// 				keys.map(key => {
// 					if (![cacheName].includes(key)) {
// 						return caches.delete(key);
// 					}
// 				})
// 			)
// 		})
// 	);
// });

// // Offline-first, cache-first strategy
// // Kick off two asynchronous requests, one to the cache and one to the network
// // If there's a cached version available, use it, but fetch an update for next time.
// // Gets data on screen as quickly as possible, then updates once the network has returned the latest data. 
// self.addEventListener("fetch", event => {
// 	event.respondWith(
// 		caches.open(cacheName).then(cache => {
// 			return cache.match(event.request).then(response => {
// 				return response || fetch(event.request).then(networkResponse => {
// 					cache.put(event.request, networkResponse.clone());
// 					return networkResponse;
// 				});
// 			})
// 		})
// 	);
// });