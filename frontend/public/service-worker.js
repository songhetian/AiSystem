// Service Worker for offline support
const CACHE_NAME = "app-cache-v1";
const RUNTIME_CACHE = "runtime-cache-v1";

// 需要预缓存的静态资源
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json"];

// 安装事件 - 预缓存静态资源
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    }),
  );
  self.skipWaiting();
});

// 激活事件 - 清理旧缓存
self.addEventListener("activate", (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return cacheNames.filter(
          (cacheName) => !currentCaches.includes(cacheName),
        );
      })
      .then((cachesToDelete) => {
        return Promise.all(
          cachesToDelete.map((cacheToDelete) => {
            return caches.delete(cacheToDelete);
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});

// 请求拦截 - 缓存策略
self.addEventListener("fetch", (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== "GET") {
    return;
  }

  // 跳过 API 请求（根据实际情况调整）
  if (event.request.url.includes("/api/")) {
    // API 请求使用 Network First 策略
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // 缓存成功的响应
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时从缓存返回
          return caches.match(event.request);
        }),
    );
    return;
  }

  // 静态资源使用 Cache First 策略
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // 缓存新的静态资源
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      });
    }),
  );
});

// 消息处理
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
