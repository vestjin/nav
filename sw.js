/* ========================================================= Service Worker - 个人导航 ========================================================= */ 
const CACHE_VERSION = 'nav-v2'; // 版本号升级，自动清理旧缓存
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './data.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
];

// 安装：预缓存所有 shell 资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS).catch((err) => {
        console.warn('[SW] 部分资源预缓存失败:', err);
      }))
      .then(() => self.skipWaiting())
  );
});

// 激活：清理旧版本缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // ---- 跨域 ----
  if (url.origin !== self.location.origin) {
    if (url.host === 'api.github.com') {
      event.respondWith(networkFirst(req, RUNTIME_CACHE));
      return;
    }
    if (url.host === 'www.google.com' && url.pathname.startsWith('/s2/favicons')) {
      event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
      return;
    }
    if (url.host === 'favicon.im') {
      event.respondWith(staleWhileRevalidate(req, RUNTIME_CACHE));
      return;
    }
    event.respondWith(networkFirst(req, RUNTIME_CACHE));
    return;
  }

  // ---- 同源 ----
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(SHELL_CACHE);
        return (await cache.match('./index.html')) || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  event.respondWith(cacheFirst(req, SHELL_CACHE));
});

// 接收页面消息
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// ---- 策略实现 ----
async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  if (cached) {
    fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const cached = await cache.match(req);
    return cached || new Response(JSON.stringify({ message: 'Offline' }), { status: 503, headers: { 'Content-Type': 'application/json' } });
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(req);
  const networkUpdate = fetch(req).then((res) => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => cached);
  return cached || networkUpdate;
}
