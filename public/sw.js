/* FORGE service worker: makes the app shell available offline.
   Data itself lives in localStorage / IndexedDB on the device. */

const VERSION = "forge-v7";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

const FONT_HOSTS = [
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "fonts.cdnfonts.com",
];

const COVER_HOSTS = [
  "covers.openlibrary.org",
  "www.gutenberg.org",
  "gutenberg.org",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      await Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" }))
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Navigations: network first, cached shell as offline fallback.
  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(VERSION);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cache = await caches.open(VERSION);
          const hit =
            (await cache.match(req)) ||
            (await cache.match("/")) ||
            (await cache.match("/index.html"));
          if (hit) return hit;
          return new Response(
            "<h1>FORGE is offline</h1><p>Open the app once while online to enable offline mode.</p>",
            { status: 503, headers: { "Content-Type": "text/html" } }
          );
        }
      })()
    );
    return;
  }

  // Static app assets: stale-while-revalidate. Cached copy answers instantly
  // (offline keeps working) while the network refreshes it in the background,
  // so a new deploy is picked up on the next load.
  const sameOrigin = url.origin === self.location.origin;
  const isStatic =
    sameOrigin &&
    (url.pathname.startsWith("/_next/static") ||
      url.pathname.startsWith("/icons") ||
      url.pathname === "/icon.svg" ||
      url.pathname === "/manifest.webmanifest");
  const isFont = FONT_HOSTS.includes(url.hostname);
  const isCover =
    req.destination === "image" && COVER_HOSTS.includes(url.hostname);

  if (isStatic) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const hit = await cache.match(req);
        const refresh = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone()).catch(() => {});
            return res;
          })
          .catch(() => null);
        if (hit) {
          event.waitUntil(refresh.then(() => undefined));
          return hit;
        }
        const fresh = await refresh;
        return fresh ?? Response.error();
      })()
    );
    return;
  }

  if (isFont || isCover) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === "opaque")) {
            cache.put(req, res.clone()).catch(() => {});
          }
          return res;
        } catch {
          return Response.error();
        }
      })()
    );
  }
  // Everything else (API routes, RSC payloads): network only.
});
