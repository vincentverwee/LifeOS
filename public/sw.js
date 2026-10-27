// LifeOS service worker: an offline screen, and Add expense that opens offline.
// Only /budget/add is kept (network-first, so it's as fresh as the last online visit);
// every other page shows offline.html when there's no connection, never stale numbers.
// Expenses saved offline are queued by the page itself (src/lib/offline/outbox.ts).
// Bump VERSION when changing what gets cached here.

const VERSION = "v3";
const SHELL_CACHE = `lifeos-shell-${VERSION}`; // offline.html + icons
const PAGES_CACHE = `lifeos-pages-${VERSION}`; // the last /budget/add
// Hashed build files. Not versioned: a cached page needs its own build's chunks,
// even after a deploy, so they're kept (oldest dropped past STATIC_LIMIT; the cached
// page's own files are moved to the end on every refresh, so they're never the oldest).
const STATIC_CACHE = "lifeos-static";
const STATIC_LIMIT = 300;

const OFFLINE_URL = "/offline.html";
const OFFLINE_PAGES = ["/budget/add"];
const SHELL = [OFFLINE_URL, "/icon-192.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const keep = new Set([SHELL_CACHE, PAGES_CACHE, STATIC_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.has(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Server actions (POST), RSC fetches and other origins go straight to the network.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigate(event, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, STATIC_LIMIT));
  } else if (SHELL.includes(url.pathname) || /^\/(icon|apple-icon)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

// In-app taps are client-side navigations (RSC fetches, not page loads), so the
// fetch handler alone would almost never see /budget/add. The page asks for a
// refresh on every load (ServiceWorkerRegister); copies younger than this are kept.
const REFRESH_AFTER = 15 * 60 * 1000;

self.addEventListener("message", (event) => {
  if (event.data === "cache-offline-pages") event.waitUntil(refreshOfflinePages());
});

async function refreshOfflinePages() {
  const cache = await caches.open(PAGES_CACHE);
  for (const path of OFFLINE_PAGES) {
    const cached = await cache.match(path);
    const fetchedAt = cached ? new Date(cached.headers.get("date") || 0).getTime() : 0;
    if (Date.now() - fetchedAt < REFRESH_AFTER) continue;
    try {
      await storePage(path, await fetch(path));
    } catch {
      // offline: keep what we have
    }
  }
}

/** Keeps a page (not a redirect to /login) plus every build file its HTML points to. */
async function storePage(path, response) {
  if (!response.ok || response.redirected) return;
  const html = await response.clone().text();
  await (await caches.open(PAGES_CACHE)).put(path, response);
  // Scripts, styles and fonts, also those only named inside the RSC payload. A copy
  // fetched in the background was never rendered, so they may not be cached yet.
  const assets = new Set(html.match(/\/_next\/static\/[^"'\s\\)]+/g) || []);
  const cache = await caches.open(STATIC_CACHE);
  await Promise.all(
    [...assets].map(async (asset) => {
      const cached = await cache.match(asset);
      // Re-putting moves it to the end, so pruning never drops a file this page needs
      // (build files that don't change between deploys were stored first).
      if (cached) return cache.put(asset, cached);
      try {
        const res = await fetch(asset);
        if (res.ok) await cache.put(asset, res);
      } catch {
        // a missing chunk only matters offline; the next refresh tries again
      }
    })
  );
  await prune(cache, STATIC_LIMIT);
}

async function navigate(event, url) {
  const offlinePage = OFFLINE_PAGES.includes(url.pathname) ? url.pathname : null;
  try {
    const response = await fetch(event.request);
    // Keep a fresh copy of the offline-capable page, plain URL only: a ?period= copy
    // would queue every offline expense into that trip.
    if (offlinePage && !url.search) event.waitUntil(storePage(offlinePage, response.clone()));
    return response;
  } catch {
    const cached = offlinePage && (await caches.match(offlinePage, { cacheName: PAGES_CACHE }));
    return cached || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function cacheFirst(request, cacheName, limit) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    if (limit) await prune(cache, limit);
  }
  return response;
}

/** Drops the oldest entries past `limit`. */
async function prune(cache, limit) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
}
