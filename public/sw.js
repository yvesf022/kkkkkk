/**
 * Karabo Store — Service Worker
 * Strategy: Network-first for API, Cache-first for assets
 * Compatible with: Chrome, Firefox, Safari (iOS 16.4+), Edge, Samsung Internet
 */

const CACHE_VERSION = "v1";
const STATIC_CACHE  = `karabo-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `karabo-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE   = `karabo-images-${CACHE_VERSION}`;

/* ── URLs to pre-cache on install ── */
const PRECACHE_URLS = [
  "/",
  "/store",
  "/account",
  "/offline",
  "/manifest.json",
];

/* ── Never cache these ── */
const NEVER_CACHE = [
  "/api/",
  "/api/auth/",
];

/* ── Cache size limits ── */
const CACHE_LIMITS = {
  [DYNAMIC_CACHE]: 60,
  [IMAGE_CACHE]: 80,
};

/* =====================================================
   INSTALL — pre-cache shell
===================================================== */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

/* =====================================================
   ACTIVATE — clean old caches
===================================================== */
self.addEventListener("activate", (event) => {
  const VALID_CACHES = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => !VALID_CACHES.includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* =====================================================
   FETCH — routing strategy
===================================================== */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  /* Skip non-GET, cross-origin, chrome-extension */
  if (
    request.method !== "GET" ||
    !url.origin.startsWith("http") ||
    url.origin !== self.location.origin && !url.hostname.includes("fonts.googleapis") && !url.hostname.includes("fonts.gstatic")
  ) {
    return;
  }

  /* API calls — network only, never cache */
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "You are offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  /* Images — cache first, fallback network */
  if (request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  /* Fonts (Google Fonts) — cache first */
  if (
    url.hostname.includes("fonts.googleapis.com") ||
    url.hostname.includes("fonts.gstatic.com")
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  /* Static assets (_next/static) — cache first, long-lived */
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  /* Navigation requests (HTML pages) — network first, fallback cache */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then((c) => c.put(request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          /* Serve offline page for navigate failures */
          const offlinePage = await caches.match("/offline");
          return offlinePage || new Response("You are offline", { status: 503 });
        })
    );
    return;
  }

  /* Everything else — stale-while-revalidate */
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

/* =====================================================
   STRATEGIES
===================================================== */

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
    await trimCache(cacheName);
    return response;
  } catch {
    return new Response("Resource unavailable offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request)
    .then((response) => {
      cache.put(request, response.clone());
      trimCache(cacheName);
      return response;
    })
    .catch(() => null);

  return cached || fetchPromise;
}

async function trimCache(cacheName) {
  const limit = CACHE_LIMITS[cacheName];
  if (!limit) return;
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > limit) {
    await cache.delete(keys[0]);
    await trimCache(cacheName);
  }
}

/* =====================================================
   BACKGROUND SYNC — retry failed requests
===================================================== */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-orders") {
    event.waitUntil(syncPendingRequests());
  }
});

async function syncPendingRequests() {
  /* Placeholder — implement with IndexedDB queue if needed */
  console.log("[SW] Background sync triggered");
}

/* =====================================================
   PUSH NOTIFICATIONS (ready to activate)
===================================================== */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: "Karabo's Store", body: event.data.text() }; }

  const options = {
    body:    data.body    || "You have a new notification",
    icon:    data.icon    || "/icons/icon-192x192.png",
    badge:   data.badge   || "/icons/badge-72x72.png",
    image:   data.image,
    tag:     data.tag     || "karabo-notification",
    renotify: true,
    vibrate: [200, 100, 200],
    data:    { url: data.url || "/" },
    actions: data.actions || [
      { action: "open",    title: "Open App" },
      { action: "dismiss", title: "Dismiss"  },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Karabo's Store", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;

  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === targetUrl && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    })
  );
});

/* =====================================================
   MESSAGE CHANNEL — communicate with app
===================================================== */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});