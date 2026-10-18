(() => {
  'use strict';
  const MANIFEST_URL = new URL('local-cognition-package-manifest.json', self.location).toString();
  let manifestPromise;
  function loadManifest() {
    if (!manifestPromise) manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error(`Manifest HTTP ${r.status}`);
      return r.json();
    });
    return manifestPromise;
  }
  function report(port, state) {
    const message = { type: 'LOCAL_COGNITION_CACHE_PROGRESS', ...state };
    if (port) port.postMessage(message);
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) =>
      clients.forEach((client) => client.postMessage(message))).catch(() => {});
  }
  async function resourceSize(url, declaredSize) {
    if (Number.isFinite(declaredSize) && declaredSize >= 0) return declaredSize;
    try {
      const response = await fetch(new Request(url, { method: 'HEAD', mode: 'cors' }), { cache: 'no-store' });
      const size = Number(response.headers.get('content-length'));
      return response.ok && Number.isFinite(size) && size >= 0 ? size : null;
    } catch (_) { return null; }
  }
  async function cachePackages(port, packageIds = null) {
    const manifest = await loadManifest();
    const cache = await caches.open(manifest.cacheName);
    const selected = Array.isArray(packageIds) && packageIds.length
      ? manifest.packages.filter((pkg) => packageIds.includes(pkg.id))
      : manifest.packages;
    const declaredSizes = manifest.resourceSizes || {};
    const resources = [...new Set(selected.flatMap((pkg) => pkg.resources || []))];
    report(port, { status: 'preparing', totalBytes: 0, downloadedBytes: 0, remainingBytes: 0, completedResources: 0, totalResources: resources.length, unknownSizeResources: resources.length });
    const entries = await Promise.all(resources.map(async (resource) => {
      const url = new URL(resource, self.location).toString();
      const request = new Request(url, { mode: 'cors' });
      const cached = Boolean(await cache.match(request).catch(() => null));
      return { resource, request, cached, size: await resourceSize(url, declaredSizes[resource]) };
    }));
    let totalBytes = entries.reduce((sum, item) => sum + (item.size ?? 0), 0);
    let unknownSizeResources = entries.filter((item) => item.size === null).length;
    let downloadedBytes = entries.reduce((sum, item) => sum + (item.cached ? item.size ?? 0 : 0), 0);
    let completedResources = entries.filter((item) => item.cached).length;
    const results = { cached: [], skipped: entries.filter((item) => item.cached).map((item) => item.resource), failed: [] };
    const snapshot = (status, currentResource = '') => ({
      status, currentResource, totalBytes, downloadedBytes,
      remainingBytes: Math.max(0, totalBytes - downloadedBytes),
      completedResources, totalResources: entries.length, unknownSizeResources
    });
    report(port, snapshot('downloading'));
    for (const item of entries) {
      if (item.cached) continue;
      try {
        const response = await fetch(item.request, { cache: 'no-store' }).catch(async (error) => {
          if (new URL(item.request.url).origin === self.location.origin) throw error;
          return fetch(new Request(item.request.url, { mode: 'no-cors' }), { cache: 'no-store' });
        });
        if (!response.ok && response.type !== 'opaque') throw new Error(`HTTP ${response.status}`);
        if (item.size === null) {
          const discovered = Number(response.headers.get('content-length'));
          if (Number.isFinite(discovered) && discovered >= 0) {
            item.size = discovered; totalBytes += discovered; unknownSizeResources -= 1;
          }
        }
        if (response.body && response.type !== 'opaque') {
          const reader = response.body.getReader();
          const stream = new ReadableStream({
            async pull(controller) {
              try {
                const part = await reader.read();
                if (part.done) {
                  controller.close(); completedResources += 1;
                  report(port, snapshot('downloading', item.resource)); return;
                }
                downloadedBytes += part.value.byteLength;
                controller.enqueue(part.value);
                report(port, snapshot('downloading', item.resource));
              } catch (error) { controller.error(error); }
            },
            cancel(reason) { return reader.cancel(reason); }
          });
          await cache.put(item.request, new Response(stream, {
            status: response.status, statusText: response.statusText, headers: response.headers
          }));
        } else {
          await cache.put(item.request, response.clone());
          downloadedBytes += item.size ?? 0; completedResources += 1;
          report(port, snapshot('downloading', item.resource));
        }
        results.cached.push(item.resource);
      } catch (error) {
        results.failed.push({ resource: item.resource, error: String(error?.message || error) });
      }
    }
    const status = results.failed.length ? 'partial' : 'complete';
    report(port, { ...snapshot(status), failedResources: results.failed.length });
    return { cacheName: manifest.cacheName, ...results, ...snapshot(status) };
  }
  async function inspectCache() {
    const manifest = await loadManifest();
    const cache = await caches.open(manifest.cacheName);
    const packages = (manifest.packages || []).map((pkg) => ({ id: pkg.id, required: pkg.required !== false, resources: pkg.resources || [] }));
    const checked = await Promise.all(packages.map(async (pkg) => {
      const missing = [];
      for (const resource of pkg.resources) {
        const request = new Request(new URL(resource, self.location).toString(), { mode: 'cors' });
        if (!await cache.match(request).catch(() => null)) missing.push(resource);
      }
      return { id: pkg.id, required: pkg.required, totalResources: pkg.resources.length, missingResources: missing };
    }));
    const missingResources = [...new Set(checked.flatMap((pkg) => pkg.missingResources))];
    return { cacheName: manifest.cacheName, ready: missingResources.length === 0, packages: checked, missingResources, missingCount: missingResources.length };
  }
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
  self.addEventListener('message', (event) => {
    const port = event.ports?.[0] || null;
    if (event.data?.type === 'CHECK_LOCAL_COGNITION_CACHE') {
      const task = inspectCache();
      event.waitUntil(task);
      if (port) task.then((result) => port.postMessage({ type: 'LOCAL_COGNITION_CACHE_CHECK_RESULT', ...result }))
        .catch((error) => port.postMessage({ type: 'LOCAL_COGNITION_CACHE_CHECK_RESULT', error: String(error?.message || error) }));
      return;
    }
    if (event.data?.type !== 'CACHE_LOCAL_COGNITION') return;
    const task = cachePackages(port, event.data?.packages || null);
    event.waitUntil(task);
    if (port) task.then((result) => port.postMessage({ type: 'LOCAL_COGNITION_CACHE_RESULT', ...result }))
      .catch((error) => port.postMessage({ type: 'LOCAL_COGNITION_CACHE_RESULT', error: String(error?.message || error) }));
  });
  self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    if (event.request.url === MANIFEST_URL) { event.respondWith(fetch(event.request)); return; }
    event.respondWith((async () => {
      const manifest = await loadManifest().catch(() => null);
      const cache = manifest ? await caches.open(manifest.cacheName).catch(() => null) : null;
      const cached = cache ? await cache.match(event.request).catch(() => null) : null;
      if (cached) return cached;
      try {
        const response = await fetch(event.request);
        if (cache && response.ok && event.request.url.startsWith(self.location.origin)) cache.put(event.request, response.clone()).catch(() => {});
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
