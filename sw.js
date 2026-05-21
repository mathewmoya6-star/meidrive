const CACHE_NAME = 'meidrive-v1';
const urlsToCache = ['/', '/index.html', '/login.html', '/register.html', '/dashboard.html', '/course.html', '/offline.html'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache)));
});

self.addEventListener('fetch', event => {
    event.respondWith(caches.match(event.request).then(response => response || fetch(event.request).catch(() => caches.match('/offline.html'))));
});
