// Service Worker for MEI DRIVE AFRICA PWA
const CACHE_NAME = 'mei-drive-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/course.html',
    '/unit.html',
    '/quiz-bank.html',
    '/supabase.js',
    '/offline.html'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => response || fetch(event.request))
    );
});
