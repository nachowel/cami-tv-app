const SHELL_CACHE = "icmg-admin-shell-v2";

// Minimal shell assets only. JS chunks are left to the browser HTTP cache.
const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/favicon.svg",
  "/fonts/NotoNaskhArabic-Regular.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests.
  if (request.method !== "GET" || !request.url.startsWith(self.location.origin)) {
    return;
  }

  const path = new URL(request.url).pathname;

  // Do not cache API, Firestore, Firebase Auth, or any data endpoints.
  // Firestore requests are cross-origin and already excluded above;
  // this guards same-origin proxies or emulator paths.
  if (
    path.startsWith("/api/") ||
    path.startsWith("/__/") ||
    path.startsWith("/firestore/")
  ) {
    return;
  }

  // Only intervene for navigation requests and the explicit shell asset list.
  const isShell =
    request.mode === "navigate" || SHELL_ASSETS.some((asset) => asset === path);

  if (!isShell) {
    // Let JS chunks and other assets use the browser HTTP cache only.
    return;
  }

  // Network-first for shell assets: try network, update cache, fall back to cache.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
