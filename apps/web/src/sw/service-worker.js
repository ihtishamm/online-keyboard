/*
 * Likho service worker: the site keeps working offline after the first visit.
 *
 * The build (src/sw/build.ts) prepends three constants:
 *   VERSION   hash of the precached files; a new build installs a new worker
 *   PRECACHE  every page and the scripts and styles each page needs
 *   ASSETS    every file under /_astro/ in this build, to drop stale ones from the cache
 *
 * Pages: network first, so a new release shows up at once; the cache answers when offline or
 * when the network takes longer than NETWORK_TIMEOUT. Hashed /_astro/ files never change, so
 * they come from the cache first; fonts, word lists and emoji data are cached the first time
 * they are fetched. The page also sends over what it fetched before this worker took control.
 */
/* global VERSION, PRECACHE, ASSETS */

const PREFIX = "likho-";
const PAGES = `${PREFIX}pages-${VERSION}`;
const RUNTIME = `${PREFIX}assets`;
const NETWORK_TIMEOUT = 4000;
/**
 * Servers answer with "Vary: Origin" or "Vary: Accept-Encoding", and fonts and module scripts
 * are requested with an Origin header that the copies fetched here lack. Cached files are
 * content-hashed or rebuilt per release, so the Vary header can be ignored.
 */
const MATCH = { ignoreSearch: true, ignoreVary: true };

/** Navigations may not be answered with a redirected response; copy it into a plain one. */
async function clean(response) {
  if (!response.redirected) return response;
  return new Response(await response.blob(), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function fetchAndCache(cacheName, request) {
  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const cache = await caches.open(cacheName);
    await cache.put(request, await clean(response.clone()));
  }
  return response;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      await Promise.all(
        PRECACHE.map(async (url) => {
          const response = await fetch(url, { cache: "no-cache" });
          if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
          await cache.put(url, await clean(response));
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith(PREFIX) && name !== PAGES && name !== RUNTIME)
          await caches.delete(name);
      }
      // Drop hashed files from earlier builds; keep everything else (fonts, word lists).
      const current = new Set(ASSETS);
      const runtime = await caches.open(RUNTIME);
      for (const request of await runtime.keys()) {
        const path = new URL(request.url).pathname;
        if (path.startsWith("/_astro/") && !current.has(path)) await runtime.delete(request);
      }
      await self.clients.claim();
    })(),
  );
});

async function page(request) {
  const cache = await caches.open(PAGES);
  const path = new URL(request.url).pathname.replace(/\/+$/, "") || "/";
  const network = fetch(request).then(async (response) => {
    if (response.ok && response.type === "basic")
      await cache.put(path, await clean(response.clone()));
    return response;
  });
  network.catch(() => undefined); // a failure is handled below; don't report it as unhandled
  const timeout = new Promise((resolve) => setTimeout(resolve, NETWORK_TIMEOUT));
  try {
    const first = await Promise.race([network, timeout]);
    if (first) return first;
  } catch {
    /* offline: fall through to the cache */
  }
  const cached = await cache.match(path, MATCH);
  if (cached) return cached;
  // Slow, not offline: keep waiting for the network; offline and never cached: the home page.
  return network.catch(async () => (await cache.match("/", MATCH)) ?? Response.error());
}

async function asset(request) {
  return (await caches.match(request, MATCH)) ?? fetchAndCache(RUNTIME, request);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (request.mode === "navigate") return event.respondWith(page(request));
  if (url.pathname === "/sw.js") return;
  event.respondWith(asset(request));
});

/** The page lists what it loaded before this worker controlled it (fonts, scripts, data). */
self.addEventListener("message", (event) => {
  const { type, urls } = event.data ?? {};
  if (type !== "cache" || !Array.isArray(urls)) return;
  event.waitUntil(
    (async () => {
      for (const href of urls) {
        const url = new URL(href, self.location.origin);
        if (url.origin !== self.location.origin || url.pathname === "/sw.js") continue;
        if (await caches.match(url.href, MATCH)) continue;
        try {
          await fetchAndCache(RUNTIME, url.href);
        } catch {
          /* offline again: it is cached next time it is used */
        }
      }
    })(),
  );
});
