const CACHE_NAME = 'htvvi-v1';
const ASSETS = [
    'https://i.postimg.cc/QdyLgcRP/Honeycam-2026-06-12-00-44-24.webp',
    'https://i.postimg.cc/CxQyCbWQ/Honeycam-2026-06-12-00-44-47.webp',
    'https://i.postimg.cc/dVxMRGbY/Honeycam-2026-06-12-00-45-17.webp',
    'https://i.postimg.cc/bwBX01KK/Honeycam-2026-06-12-00-42-42.webp',
    'https://i.postimg.cc/K8HX7tdW/Honeycam-2026-06-12-00-44-00.webp'
];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});