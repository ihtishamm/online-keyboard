/*
 * Likho service worker: pages keep working offline after the first visit.
 *
 * The build (src/sw/build.ts) prepends five constants:
 *   VERSION     hash of every page and precached file; a new build installs a new worker
 *   PRECACHE    the app shell (home page, offline page) and the scripts and styles it needs
 *   ASSETS      every file under /_astro/ in this build, to drop stale ones from the cache
 *   HTML_REFS   finds the scripts and styles in a page
 *   JS_IMPORTS  finds a script's static imports
 *
 * Pages: network first, so a new release shows up at once; the cache answers when offline or
 * when the network takes longer than NETWORK_TIMEOUT. Every page opened is kept. A page never
 * opened shows /offline when there is no network. Hashed /_astro/ files never change, so they
 * come from the cache first; fonts, word lists and emoji data are cached the first time they
 * are fetched. The page also sends over what it fetched before this worker took control.
 *
 * "Save for offline" on a language page sends { type: "save", slug }: the worker stores every
 * page listed in /offline/<slug>.json with its scripts and styles, and the data files listed
 * there, and keeps the list in the SAVED cache. A new worker fetches the new copies of every
 * page kept and every language saved before it takes over, so offline use survives updates.
 */
/* global VERSION, PRECACHE, ASSETS, HTML_REFS, JS_IMPORTS */

const PREFIX = "likho-";
const PAGES = `${PREFIX}pages-${VERSION}`;
const RUNTIME = `${PREFIX}assets`;
/** Saved languages: /offline/<slug>.json -> that manifest. */
const SAVED = `${PREFIX}saved`;
const NETWORK_TIMEOUT = 4000;
/** Downloads at once while saving: enough to be quick, few enough not to stall a phone. */
const PARALLEL = 4;
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

/** "/urdu/" and "/urdu?x" -> "/urdu", the key pages are cached under. */
const pageKey = (url) => new URL(url, self.location.origin).pathname.replace(/\/+$/, "") || "/";

/** Runs task on every item, PARALLEL at a time; resolves to the items that failed. */
async function each(items, task) {
  const failed = [];
  const queue = [...items];
  const worker = async () => {
    while (queue.length) {
      const item = queue.shift();
      try {
        await task(item);
      } catch {
        failed.push(item);
      }
    }
  };
  await Promise.all(Array.from({ length: PARALLEL }, worker));
  return failed;
}

/** A file's text, from the cache or else the network (and then cached). */
async function assetText(url) {
  const hit = await caches.match(url, MATCH);
  if (hit) return hit.text();
  const response = await fetchAndCache(RUNTIME, url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.text();
}

/** Stores a page with the scripts and styles it loads, following static imports. */
async function storePage(cache, path) {
  const response = await clean(await fetch(path, { cache: "no-cache" }));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  const html = await response.clone().text();
  const seen = new Set();
  const queue = [...html.matchAll(HTML_REFS)].map((m) => m[1]);
  while (queue.length) {
    const url = queue.shift();
    if (seen.has(url)) continue;
    seen.add(url);
    const text = await assetText(url);
    if (!url.endsWith(".js")) continue;
    for (const m of text.matchAll(JS_IMPORTS)) {
      queue.push(m[1].startsWith("/") ? m[1] : new URL(m[1], self.location.origin + url).pathname);
    }
  }
  // Last, so a page is only kept once everything it needs is.
  await cache.put(path, response);
}

async function storeFile(url) {
  if (await caches.match(url, MATCH)) return;
  const response = await fetchAndCache(RUNTIME, url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
}

/** Saves a language for offline use; resolves to the number of pages stored. */
async function save(slug) {
  const key = `/offline/${encodeURIComponent(slug)}.json`;
  const response = await fetch(key, { cache: "no-cache" });
  if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
  const manifest = await response.clone().json();
  const cache = await caches.open(PAGES);
  const failed = [
    ...(await each(manifest.pages, (path) => storePage(cache, path))),
    ...(await each(manifest.files, storeFile)),
  ];
  if (failed.length) throw new Error(`not saved: ${failed.join(", ")}`);
  await (await caches.open(SAVED)).put(key, response);
  return manifest.pages.length;
}

async function savedSlugs() {
  const saved = await caches.open(SAVED);
  return (await saved.keys()).map((r) =>
    decodeURIComponent(new URL(r.url).pathname.replace(/^\/offline\/|\.json$/g, "")),
  );
}

/**
 * Before a new worker takes over: fetch this release's copy of every page the old one kept
 * and of every saved language, and refresh data files whose names don't change between
 * releases. Best effort: anything that fails is fetched again when next used online.
 */
async function carryOver(cache) {
  await each(await savedSlugs(), save);

  const shell = new Set(PRECACHE);
  const pages = new Set();
  for (const name of await caches.keys()) {
    if (!name.startsWith(`${PREFIX}pages-`) || name === PAGES) continue;
    for (const request of await (await caches.open(name)).keys()) {
      const path = pageKey(request.url);
      if (!shell.has(path)) pages.add(path);
    }
  }
  await each(pages, async (path) => {
    if (!(await cache.match(path, MATCH))) await storePage(cache, path);
  });

  const runtime = await caches.open(RUNTIME);
  for (const request of await runtime.keys()) {
    const path = new URL(request.url).pathname;
    // Hashed or versioned paths never change; others (typing data, icons) may.
    if (path.startsWith("/_astro/") || path.startsWith("/unicode/")) continue;
    try {
      const response = await fetch(request, { cache: "no-cache" });
      if (response.ok) await runtime.put(request, response);
    } catch {
      /* keep the old copy */
    }
  }
}

/** Forgets a saved language and deletes its pages and data files (not the shell). */
async function unsave(slug) {
  const key = `/offline/${encodeURIComponent(slug)}.json`;
  const saved = await caches.open(SAVED);
  const response = await saved.match(key);
  if (!response) return;
  const manifest = await response.json();
  const pages = await caches.open(PAGES);
  const runtime = await caches.open(RUNTIME);
  for (const path of manifest.pages) if (!PRECACHE.includes(path)) await pages.delete(path, MATCH);
  for (const url of manifest.files) await runtime.delete(url, MATCH);
  await saved.delete(key);
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
      await carryOver(cache);
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([PAGES, RUNTIME, SAVED]);
      for (const name of await caches.keys()) {
        if (name.startsWith(PREFIX) && !keep.has(name)) await caches.delete(name);
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
  const path = pageKey(request.url);
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
  // Slow, not offline: keep waiting for the network. Offline and never opened: say so.
  return network.catch(
    async () =>
      (await cache.match("/offline", MATCH)) ?? (await cache.match("/", MATCH)) ?? Response.error(),
  );
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

/** Answers a message sent with a MessageChannel; errors go back as { error }. */
function reply(event, work) {
  const port = event.ports[0];
  event.waitUntil(
    work.then(
      (result) => port?.postMessage({ version: VERSION, ...result }),
      (error) => port?.postMessage({ version: VERSION, error: String(error?.message ?? error) }),
    ),
  );
}

self.addEventListener("message", (event) => {
  const { type, urls, slug, page: path } = event.data ?? {};
  // The page sends its address and what it loaded before this worker controlled it (fonts,
  // scripts, data).
  if (type === "cache" && Array.isArray(urls)) {
    event.waitUntil(
      (async () => {
        if (typeof path === "string") {
          const cache = await caches.open(PAGES);
          const key = pageKey(path);
          if (!(await cache.match(key, MATCH))) {
            try {
              await storePage(cache, key);
            } catch {
              /* stored when next opened online */
            }
          }
        }
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
  } else if (type === "save" && typeof slug === "string") {
    reply(
      event,
      save(slug).then((pages) => ({ pages })),
    );
  } else if (type === "unsave" && typeof slug === "string") {
    reply(
      event,
      unsave(slug).then(() => ({})),
    );
  } else if (type === "saved") {
    reply(
      event,
      savedSlugs().then((slugs) => ({ slugs })),
    );
  }
});
