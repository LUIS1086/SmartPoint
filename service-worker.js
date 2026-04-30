/* ============================================================
 * SMART POINT · SERVICE WORKER
 * Estrategia:
 *  · Shell estática (HTML, manifest, iconos): cache-first con
 *    revalidación en segundo plano.
 *  · Recursos externos (CDNs de Tailwind, Google Fonts, Gemini,
 *    Drive): network-first con fallback a cache.
 *  · La app recibe `UPDATE_CACHE` desde index.html cuando el
 *    usuario fuerza una actualización: limpiamos el cache
 *    estático y forzamos skipWaiting.
 * ============================================================ */

const CACHE_VERSION = 'smartpoint-v3.0.0';
const STATIC_CACHE  = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// Recursos que se precargan al instalar el SW (shell mínimo)
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icons/icon-192x192.png',
    './icons/icon-512x512.png'
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

    // Solo manejamos GET — POST/PUT/DELETE pasan directo (Drive, Gemini, etc.)
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // No interceptar APIs externas críticas (Google Drive, Gemini, OAuth)
    // para evitar problemas con tokens, streaming y rate limits.
    const SKIP_HOSTS = [
        'googleapis.com',
        'google.com',
        'gstatic.com/accounts',
        'generativelanguage.googleapis.com'
    ];
    if (SKIP_HOSTS.some(h => url.hostname.includes(h))) {
        return; // dejar que el browser lo maneje normalmente
    }

    // Estrategia para navegación (HTML): network-first, fallback a cache.
    // Así Luis siempre ve la última versión cuando hay internet.
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

    // Recursos same-origin (iconos, manifest): cache-first
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(req).then(cached => {
                if (cached) {
                    // revalidación en segundo plano
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

    // CDNs externos (Tailwind, Google Fonts CSS): stale-while-revalidate
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

// ──────────────────────── MENSAJES DESDE LA APP ────────────────────────
self.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'UPDATE_CACHE') {
        // El usuario pidió actualizar: borrar cache y reiniciar
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
