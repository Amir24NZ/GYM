const CACHE_NAME = 'gym-cache-v1'; // نام کش
const ASSETS = [
    './style.css',
    './script.js',
    './manifest.json',
    './pic.jpg'
];

// نصب سرویس ورکر
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// استراتژی دریافت فایل‌ها
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // فایل version.json همیشه از شبکه خوانده شود (برای چک کردن آپدیت)
    if (url.pathname.includes('version.json')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // فایل index.html همیشه از شبکه خوانده شود (برای اطمینان از لود کد جدید)
    // اما اگر اینترنت نبود، از کش می‌خواند
    if (e.request.url === location.origin + '/' || e.request.url === location.origin + '/index.html') {
        e.respondWith(
            fetch(e.request).catch(() => {
                return caches.match(e.request);
            })
        );
        return;
    }

    // بقیه فایل‌ها (CSS, JS, عکس) اول از کش، اگر نبود از شبکه
    if (url.origin === location.origin) {
        e.respondWith(
            caches.match(e.request).then((response) => {
                return response || fetch(e.request);
            })
        );
    }
});