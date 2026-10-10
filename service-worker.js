const CACHE_NAME = "seikei-midterm-202610-2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./data/study-data.js",
  "./core.js",
  "./app.js",
  "./print.html",
  "./coverage.html",
  "./coverage.csv",
  "./data/coverage.json",
  "./sources.html"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS.map(url => new Request(url, {cache: 'reload'}))))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => (key === 'seikei-study-v2' || key.startsWith('seikei-midterm-202610-')) && key !== CACHE_NAME).map(key => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  // Immutable release: never combine a new network script with an older shell.
  // Missing assets return their actual error, never HTML in place of JavaScript.
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        return response;
      }).catch(() => new Response('Offline: asset unavailable', {status: 503, headers: {'Content-Type':'text/plain; charset=utf-8'}}));
    })
  );
});
