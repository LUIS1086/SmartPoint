/* ============================================================
 * SMART POINT · SERVICE WORKER (PWABuilder optimized)
 * ────────────────────────────────────────────────────────────
 *  Versión optimizada heredando todo lo aprendido de NelsonApp:
 *  · Shell estática: cache-first con revalidación.
 *  · APIs externas (Drive, Gemini, OAuth): NO interceptar.
 *  · CDNs: stale-while-revalidate.
 *  · push + notificationclick handlers (PWABuilder los detecta).
 *  · UPDATE_CACHE para forzar refresh desde la app.
 * ============================================================ */

const CACHE_VERSION = 'smartpoint-v3.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png'
];

// ──────────────────────── INSTALL ────────────────────────
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => cache.addAll(PRECACHE_URLS))
            .then(() => self.skipWaiting())
            .catch(err => console.warn('[SW] Precache parcial:', err))
    );
});

// ──────────────────────── ACTIVATE ────────────────────────
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(names => Promise.all(
                names
                    .filter(n => n.startsWith('smartpoint-') && !n.startsWith(CACHE_VERSION))
                    .map(n => caches.delete(n))
            ))
            .then(() => self.clients.claim())
    );
});

// ──────────────────────── FETCH ────────────────────────
self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // No interceptar APIs externas críticas (Google Drive/IA/OAuth)
    const SKIP_HOSTS = [
        'googleapis.com',
        'google.com',
        'gstatic.com/accounts',
        'generativelanguage.googleapis.com'
    ];
    if (SKIP_HOSTS.some(h => url.hostname.includes(h))) {
        return;
    }

    // HTML: network-first
    if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
        event.respondWith(
            fetch(req)
                .then(resp => {
                    const copy = resp.clone();
                    caches.open(STATIC_CACHE).then(c => c.put(req, copy)).catch(() => {});
                    return resp;
                })
                .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
        );
        return;
    }

    // Same-origin: cache-first con revalidación en background
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(req).then(cached => {
                if (cached) {
                    fetch(req).then(resp => {
                        if (resp && resp.status === 200) {
                            caches.open(STATIC_CACHE).then(c => c.put(req, resp));
                        }
                    }).catch(() => {});
                    return cached;
                }
                return fetch(req).then(resp => {
                    if (resp && resp.status === 200 && resp.type === 'basic') {
                        const copy = resp.clone();
                        caches.open(STATIC_CACHE).then(c => c.put(req, copy));
                    }
                    return resp;
                }).catch(() => cached);
            })
        );
        return;
    }

    // CDNs externos: stale-while-revalidate
    event.respondWith(
        caches.open(RUNTIME_CACHE).then(cache =>
            cache.match(req).then(cached => {
                const fetchPromise = fetch(req).then(resp => {
                    if (resp && resp.status === 200) {
                        cache.put(req, resp.clone());
                    }
                    return resp;
                }).catch(() => cached);
                return cached || fetchPromise;
            })
        )
    );
});

// ──────────────────────── PUSH ────────────────────────
self.addEventListener('push', (event) => {
    let data = { title: 'Smart Point', body: 'Tienes una notificación nueva' };
    try { if (event.data) data = event.data.json(); } catch(_) {
        try { if (event.data) data.body = event.data.text(); } catch(_) {}
    }
    const options = {
        body: data.body || '',
        icon: './icon-192x192.png',
        badge: './icon-96x96.png',
        tag: data.tag || 'smartpoint',
        renotify: true,
        data: data.url || '/'
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Smart Point', options));
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data || '/';
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            for (const c of list) {
                if ('focus' in c) return c.focus();
            }
            if (clients.openWindow) return clients.openWindow(targetUrl);
        })
    );
});

// ──────────────────────── MENSAJES ────────────────────────
self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'UPDATE_CACHE') {
        event.waitUntil(
            caches.keys()
                .then(names => Promise.all(names.map(n => caches.delete(n))))
                .then(() => self.skipWaiting())
                .then(() => self.clients.matchAll().then(clients => {
                    clients.forEach(c => c.postMessage({ type: 'CACHE_UPDATED' }));
                }))
        );
    }
    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
