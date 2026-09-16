// 5STAR.M service worker (STEP 31). Hand-written rather than a
// generator plugin (e.g. next-pwa) — this app has no other build-tool
// dependency and the caching rules here are simple enough that a
// generated 500-line runtime would add more risk than it removes.
//
// Rules, deliberately conservative:
//  - Never cache anything under /admin, /agent, /customer or /api —
//    that's private, session-specific, per-user data. Caching it would
//    directly violate section 26's "do not cache sensitive information"
//    rule. Those requests always go straight to the network.
//  - Public marketing pages (/, /properties*, /projects*, /about,
//    /services, /contact) use stale-while-revalidate so a previously
//    viewed page still opens instantly (and offline), while always
//    refreshing in the background.
//  - Static hashed assets (/_next/static/*, /icons/*) are cache-first —
//    safe, since their URLs change when their content does.
//  - A failed navigation with nothing cached falls back to
//    /offline.html rather than the browser's own ugly error page.
const VERSION = "v1";
const APP_SHELL_CACHE = `5starm-shell-${VERSION}`;
const RUNTIME_CACHE = `5starm-runtime-${VERSION}`;

const APP_SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png"];

const PRIVATE_PREFIXES = ["/admin", "/agent", "/customer", "/api", "/login", "/register", "/forgot-password", "/reset-password"];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== APP_SHELL_CACHE && k !== RUNTIME_CACHE)
            .map((k) => caches.delete(k))
        )
      ),
      self.clients.claim(),
    ])
  );
});

// The install-prompt/update UI posts this once the user taps "Update
// Now" — lets a waiting worker take over immediately instead of only on
// the next full page load.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivatePath(url.pathname)) return; // straight to network, never cached

  // Static, content-hashed assets — cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Navigations (actual page loads) — network-first with an offline
  // fallback, so a visitor always sees the freshest page when online.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("/offline.html")))
    );
    return;
  }

  // Everything else public (images, fonts, data requests on public
  // pages) — stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "5STAR.M", body: event.data.text() };
  }
  const title = payload.title || "5STAR.M Estate & Builders";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: payload.tag || "5starm-notification",
      data: { url: payload.url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
