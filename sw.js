// Offline support: try the network first (so updates arrive), fall back to the saved copy.
const CACHE = 'prep-v2';  // offline copy of the app
const FILES = ['./', 'index.html', 'version.json', 'data.bin', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => { e.waitUntil(self.clients.claim()); });

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // data.bin?v=123 and data.bin share one cache entry
  const key = url.pathname.endsWith('/data.bin') ? new Request(url.pathname) : e.request;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), url.pathname.endsWith('/data.bin') ? 20000 : 5000);
      const res = await fetch(url.href, { signal: ctrl.signal, cache: 'no-store' });
      clearTimeout(timer);
      if (res.ok) cache.put(key, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(key, { ignoreSearch: true });
      if (hit) return hit;
      if (e.request.mode === 'navigate') return cache.match('index.html');
      throw err;
    }
  })());
});
