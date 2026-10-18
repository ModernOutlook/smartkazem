(() => {
  'use strict';

  const MANIFEST_URL = new URL('local-cognition-package-manifest.json', self.location).toString();
  let manifestPromise;

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
        return response.json();
      });
    }
    return manifestPromise;
  }

  async function cachePackages() {
    const manifest = await loadManifest();
    const cache = await caches.open(manifest.cacheName);
    const resources = [...new Set(manifest.packages.flatMap((pkg) => pkg.resources || []))];
    const results = { cached: [], skipped: [], failed: [] };

    for (const resource of resources) {
      const request = new Request(new URL(resource, self.location).toString(), { mode: 'no-cors' });
      try {
        const existing = await cache.match(request);
        if (existing) {
          results.skipped.push(resource);
          continue;
        }

        const response = await fetch(request, { cache: 'no-store' });
        if (!response.ok && response.type !== 'opaque') {
          throw new Error(`HTTP ${response.status}`);
        }
        await cache.put(request, response.clone());
        results.cached.push(resource);
      } catch (error) {
        results.failed.push({ resource, error: String(error?.message || error) });
      }
    }

    return { cacheName: manifest.cacheName, ...results };
  }

  self.addEventListener('install', () => {
    self.skipWaiting();
  });

  self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
  });

  self.addEventListener('message', (event) => {
    if (event.data?.type !== 'CACHE_LOCAL_COGNITION') return;

    const task = cachePackages();
    if (event.ports?.[0]) {
      task.then((result) => event.ports[0].postMessage(result)).catch((error) => {
        event.ports[0].postMessage({ error: String(error?.message || error) });
      });
    }
    event.waitUntil?.(task);
  });

  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url === MANIFEST_URL) {
      event.respondWith(fetch(event.request));
      return;
    }

    event.respondWith((async () => {
      const manifest = await loadManifest().catch(() => null);
      const cache = manifest ? await caches.open(manifest.cacheName).catch(() => null) : null;
      const cached = cache ? await cache.match(event.request) : null;
      if (cached) return cached;

      try {
        const response = await fetch(event.request);
        if (cache && response.ok && event.request.url.startsWith(self.location.origin)) {
          cache.put(event.request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        if (cache && event.request.mode === 'navigate') {
          const fallback = await cache.match(new URL('index.html', self.location).toString());
          if (fallback) return fallback;
        }
        throw error;
      }
    })());
  });
})();
