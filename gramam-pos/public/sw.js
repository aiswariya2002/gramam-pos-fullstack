// sw.js
define(["./workbox-07bbbe18"], function (e) {
  "use strict";

  // 🔹 Activate immediately
  self.skipWaiting();
  e.clientsClaim();

  // 🔹 Precache all built assets (auto-filled by Vite/Workbox)
  e.precacheAndRoute(self.__WB_MANIFEST || [], {
    ignoreURLParametersMatching: [/__WB_REVISION__/],
  });

  // 🔹 Cleanup outdated caches
  e.cleanupOutdatedCaches();

  // 🔹 App shell routing (for SPA navigation)
  e.registerRoute(
    new e.NavigationRoute(e.createHandlerBoundToURL("/index.html"), {
      allowlist: [/^\/(?!api).*/], // Allow everything except API routes
    })
  );

  // 🔹 Cache: static public assets (CSS, JS, icons)
  e.registerRoute(
    ({ url }) =>
      url.origin === self.location.origin && url.pathname.startsWith("/assets/"),
    new e.CacheFirst({
      cacheName: "public-assets",
      plugins: [
        new e.CacheableResponsePlugin({ statuses: [0, 200] }),
        new e.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 }), // 1 year
      ],
    }),
    "GET"
  );

  // 🔹 Cache: uploaded product images
  e.registerRoute(
    ({ url }) =>
      url.origin === self.location.origin && url.pathname.startsWith("/uploads"),
    new e.CacheFirst({
      cacheName: "uploaded-product-images",
      plugins: [
        new e.CacheableResponsePlugin({ statuses: [0, 200] }),
        new e.ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 365 }),
      ],
    }),
    "GET"
  );

  // 🔹 Cache: product list API (offline product browsing)
  e.registerRoute(
    ({ url }) =>
      url.origin === self.location.origin &&
      url.pathname.startsWith("/api/product"),
    new e.StaleWhileRevalidate({
      cacheName: "products-cache",
      plugins: [
        new e.CacheableResponsePlugin({ statuses: [0, 200] }),
        new e.ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        }),
      ],
    }),
    "GET"
  );

  // 🔹 Background Sync: failed bills (auto-upload later)
  e.registerRoute(
    ({ url }) =>
      url.origin === self.location.origin && url.pathname.startsWith("/api/bill"),
    new e.NetworkOnly({
      plugins: [
        new e.BackgroundSyncPlugin("posTransactionQueue", {
          maxRetentionTime: 1440, // 24 hours
        }),
      ],
    }),
    ["POST"]
  );

  // 🔹 Fallback: serve index.html when offline
  self.addEventListener("fetch", (event) => {
    if (event.request.mode === "navigate") {
      event.respondWith(
        fetch(event.request).catch(() => caches.match("/index.html"))
      );
    }
  });
});
