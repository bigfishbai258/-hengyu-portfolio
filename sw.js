/* The build replaces both tokens; this file is never registered in development. */
const VERSION = "b0dee3ee7d7cb0e8";
const FILES = ["assets/index-BI6Iehev.css","assets/index-BTy7PTe9.js","favicon.svg","icons/app-icon.svg","icons/apple-touch-icon.png","icons/icon-192.png","icons/icon-512.png","icons/icon-maskable-512.png","index.html","manifest.webmanifest"];
const SCOPE = self.registration.scope;
const PREFIX = `rhine-lab:${new URL(SCOPE).pathname}:`;
const CACHE = PREFIX + VERSION;
const urls = FILES.map((path) => new URL(path, SCOPE).href);
const allowed = new Set(urls);
const index = new URL("index.html", SCOPE).href;

function isRuntimeCacheable(url) {
  if (!url.startsWith(SCOPE)) return false;
  const rel = url.slice(SCOPE.length);
  return (
    rel === "portfolio.pdf" ||
    /^(assets|works|fonts|audio|archives|icons|licenses)\//.test(rel)
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        let next = 0;
        const workers = Array.from({ length: 4 }, async () => {
          while (next < urls.length) {
            const url = urls[next++];
            if (url === index) {
              // Pages redirects index.html to the directory URL. Keep the release's
              // cache key, but fetch the canonical page without a followed redirect.
              const response = await fetch(new Request(SCOPE, { cache: "no-cache" }));
              if (!response.ok) throw new Error(`Homepage download failed: ${response.status}`);
              await cache.put(url, response);
            } else {
              const hashed = /\/assets\/index-[^/]+\.(js|css)$/.test(url);
              await cache.add(new Request(url, { cache: hashed ? "default" : "no-cache" }));
            }
          }
        });
        const results = await Promise.allSettled(workers);
        const failure = results.find((result) => result.status === "rejected");
        if (failure) throw failure.reason;
      } catch (error) {
        await caches.delete(CACHE);
        throw error;
      }
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) {
        if (key.startsWith(PREFIX) && key !== CACHE) await caches.delete(key);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "RHINE_APPLY_UPDATE") event.waitUntil(self.skipWaiting());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.headers.has("range")) return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  url.search = "";
  url.hash = "";
  const navigation =
    event.request.mode === "navigate" &&
    (url.href === SCOPE || url.href === index);
  const key = navigation ? index : url.href;
  const precached = allowed.has(key);
  const runtime = !precached && isRuntimeCacheable(key);
  if (!precached && !runtime) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(key);
      if (cached) {
        if (navigation && cached.redirected) {
          return new Response(cached.body, {
            status: cached.status,
            statusText: cached.statusText,
            headers: cached.headers,
          });
        }
        return cached;
      }
      const response = await fetch(event.request);
      if (response.ok && response.status === 200 && response.type === "basic") {
        event.waitUntil(cache.put(key, response.clone()).catch(() => {}));
      }
      return response;
    })(),
  );
});
