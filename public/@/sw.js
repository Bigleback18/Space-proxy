/* global UVServiceWorker, __uv$config */
importScripts('/@/uv.bundle.js', '/@/uv.config.js', '/@/uv.sw.js');
const uv = new UVServiceWorker();
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.url.startsWith(self.location.origin + __uv$config.prefix)) {
    event.respondWith((async () => {
      try {
        const response = await uv.fetch(event);
        if (event.request.mode === 'navigate' && response.status >= 500) {
          const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
          for (const client of windows) client.postMessage({ type: 'space:load-error', url: event.request.url });
        }
        return response;
      } catch {
        return new Response('The website could not be reached. Use the address bar to try another page.', {
          status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
  }
});
