// sw.js — Service worker simple para uso offline.
// La app es 100% local (sin llamadas a servidores), así que la estrategia
// es cache-first: una vez cacheado, todo carga instantáneo y sin red.

const CACHE_NAME = 'rez-lector-v4';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.css',
  './manifest.json',
  './lib/jszip.min.js',
  './js/app.js',
  './js/storage.js',
  './js/theme.js',
  './js/rsvp-engine.js',
  './js/library.js',
  './js/reader.js',
  './js/parsers/epub.js',
  './js/parsers/txt.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cacheamos también lo que se vaya pidiendo de más, por si se agregan assets.
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }).catch(() => cached);
    })
  );
});
