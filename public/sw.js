const STATIC_CACHE = "bt-static-v1";
const RUNTIME_CACHE = "bt-runtime-v1";
const API_CACHE = "bt-api-v1";

const MAX_RUNTIME_ENTRIES = 80;
const MAX_API_ENTRIES = 120;

const APP_SHELL_ASSETS = [
  "/",
  "/index.html",
  "/offline.html",
  "/manifest.json",
  "/favicon.ico",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

const CACHE_WHITELIST = new Set([STATIC_CACHE, RUNTIME_CACHE, API_CACHE]);
const STATIC_DESTINATIONS = new Set(["script", "style", "image", "font"]);
const PUBLIC_API_HOSTS = new Set(["api.exchangerate-api.com", "api.coingecko.com"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(APP_SHELL_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => !CACHE_WHITELIST.has(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CLEAR_API_CACHE") {
    return;
  }

  event.waitUntil(caches.delete(API_CACHE));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  if (request.cache === "only-if-cached" && request.mode !== "same-origin") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isSameOriginStaticAssetRequest(request, url)) {
    event.respondWith(handleCacheFirstRequest(request, RUNTIME_CACHE, MAX_RUNTIME_ENTRIES));
    return;
  }

  if (isApiReadRequest(request, url)) {
    event.respondWith(handleApiRequest(request));
  }
});

const isSameOriginStaticAssetRequest = (request, url) => {
  return url.origin === self.location.origin && STATIC_DESTINATIONS.has(request.destination);
};

const isSupabaseHost = (hostname) => hostname.endsWith(".supabase.co");

const isSupabaseReadRequest = (request, url) => {
  if (request.method !== "GET" || !isSupabaseHost(url.hostname)) {
    return false;
  }

  return url.pathname.startsWith("/rest/v1/") || url.pathname.startsWith("/functions/v1/");
};

const isPublicApiReadRequest = (request, url) => {
  return request.method === "GET" && PUBLIC_API_HOSTS.has(url.hostname);
};

const isAuthRequest = (url) => {
  return isSupabaseHost(url.hostname) && url.pathname.startsWith("/auth/v1/");
};

const isApiReadRequest = (request, url) => {
  if (isAuthRequest(url)) {
    return false;
  }

  return isSupabaseReadRequest(request, url) || isPublicApiReadRequest(request, url);
};

const handleNavigationRequest = async (request) => {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const runtimeCache = await caches.open(RUNTIME_CACHE);
      await runtimeCache.put(request, response.clone());
      await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
    }

    return response;
  } catch {
    const cachedRoute = await caches.match(request);
    if (cachedRoute) {
      return cachedRoute;
    }

    const cachedIndex = await caches.match("/index.html");
    if (cachedIndex) {
      return cachedIndex;
    }

    const offlinePage = await caches.match("/offline.html");
    if (offlinePage) {
      return offlinePage;
    }

    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
};

const handleCacheFirstRequest = async (request, cacheName, maxEntries) => {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
    await trimCache(cacheName, maxEntries);
  }

  return response;
};

const handleApiRequest = async (request) => {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const apiCache = await caches.open(API_CACHE);
      await apiCache.put(request, response.clone());
      await trimCache(API_CACHE, MAX_API_ENTRIES);
    }

    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
};

const trimCache = async (cacheName, maxEntries) => {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length <= maxEntries) {
    return;
  }

  const overflow = keys.length - maxEntries;

  for (let index = 0; index < overflow; index += 1) {
    await cache.delete(keys[index]);
  }
};
