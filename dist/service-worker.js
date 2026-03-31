const APP_VERSION = "v1.1.45";
const CACHE_PREFIX = "iron-log-pwa";
const CACHE_NAME = `${CACHE_PREFIX}-${APP_VERSION}`;
const APP_SHELL = [
  "./",
  "./index.html",
  "./ironlog.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./iron_log_logo.png"
];
const CORE_PATHS = new Set([
  "/",
  "/index.html",
  "/ironlog.html",
  "/manifest.json",
  "/css/styles.css",
  "/js/app.js"
]);

function isCoreAsset(url){
  return CORE_PATHS.has(url.pathname);
}

async function cacheAppShell(){
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
}

async function networkFirst(request, fallbackUrl = null){
  const cache = await caches.open(CACHE_NAME);
  try{
    const response = await fetch(request, { cache: "no-store" });
    if(response && response.ok){
      cache.put(request, response.clone());
      if(fallbackUrl){
        cache.put(fallbackUrl, response.clone());
      }
    }
    return response;
  }catch(_error){
    const cached = await caches.match(request);
    if(cached) return cached;
    if(fallbackUrl){
      const fallback = await caches.match(fallbackUrl);
      if(fallback) return fallback;
    }
    throw _error;
  }
}

async function staleWhileRevalidate(request){
  const cache = await caches.open(CACHE_NAME);
  const cached = await caches.match(request);
  const networkPromise = fetch(request)
    .then(response => {
      if(response && response.ok && response.type === "basic"){
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);
  return cached || networkPromise;
}

self.addEventListener("install", event => {
  event.waitUntil(cacheAppShell());
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("message", event => {
  if(event.data?.type === "SKIP_WAITING"){
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  const { request } = event;
  if(request.method !== "GET") return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return;

  if(request.mode === "navigate"){
    event.respondWith(networkFirst(request, "./index.html"));
    return;
  }

  if(isCoreAsset(url)){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
