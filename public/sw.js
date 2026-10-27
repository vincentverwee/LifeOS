// LifeOS service worker: an offline screen, and Add expense that opens offline.
// Only /budget/add is kept (network-first, so it's as fresh as the last online visit);
// every other page shows offline.html when there's no connection, never stale numbers.
// Expenses saved offline are queued by the page itself (src/lib/offline/outbox.ts).
// Bump VERSION when changing what gets cached here.

const VERSION = "v1";
const SHELL_CACHE = `lifeos-shell-${VERSION}`; // offline.html + icons
const PAGES_CACHE = `lifeos-pages-${VERSION}`; // the last /budget/add
// Hashed build files. Not versioned: a cached page needs its own build's chunks,
// even after a deploy, so they're kept (oldest dropped past STATIC_LIMIT).
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
    event.respondWith(navigate(request, url));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, STATIC_LIMIT));
  } else if (SHELL.includes(url.pathname) || /^\/(icon|apple-icon)/.test(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
  }
});

async function navigate(request, url) {
  const offlinePage = OFFLINE_PAGES.includes(url.pathname) ? url.pathname : null;
  try {
    const response = await fetch(request);
    // Keep a fresh copy of the offline-capable page (not a redirect to /login).
    if (offlinePage && response.ok && !response.redirected) {
      const cache = await caches.open(PAGES_CACHE);
      await cache.put(offlinePage, response.clone());
    }
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
    if (limit) {
      const keys = await cache.keys();
      await Promise.all(keys.slice(0, Math.max(0, keys.length - limit)).map((key) => cache.delete(key)));
    }
  }
  return response;
}
