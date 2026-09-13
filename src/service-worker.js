/* global self, caches, fetch, Response, URL */
/**
 * Workbox replaces __WB_MANIFEST with the files emitted by the same build.
 * Keeping HTML and its hashed entry module together prevents deploys from
 * serving an old document whose JavaScript was removed by Hosting.
 */
const manifest = self.__WB_MANIFEST;
const cachePrefix = 'liga-mx-precache-';
const cacheName = `${cachePrefix}${manifest
  .map(entry => entry.revision)
  .join('-')}`;

const assetUrls = manifest.map(entry => entry.url);

self.addEventListener('install', event => {
  event.waitUntil(
    caches
      .open(cacheName)
      .then(cache => cache.addAll(assetUrls))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys => {
        const oldCaches = keys.filter(
          key => key.startsWith(cachePrefix) && key !== cacheName,
        );
        return Promise.all(oldCaches.map(key => caches.delete(key))).then(
          () => oldCaches.length > 0,
        );
      })
      .then(async replacedVersion => {
        await self.clients.claim();
        if (!replacedVersion) return;
        const clients = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        await Promise.all(clients.map(client => client.navigate(client.url)));
      }),
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(cacheName);
        return (await cache.match('index.html')) || Response.error();
      }),
    );
    return;
  }

  const url = new URL(request.url);
  const assetPath = url.pathname.replace(/^\//, '');
  if (!assetUrls.includes(assetPath)) return;

  event.respondWith(
    caches.open(cacheName).then(async cache => {
      return (await cache.match(assetPath)) || fetch(request);
    }),
  );
});
