/**
 * Service Worker — Tetris Retro PWA
 * Estratégia: Cache First para assets estáticos, Network First para navegação.
 */

const CACHE_NAME   = 'tetris-retro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
];

// ── Instalação: pré-cache dos assets essenciais ──────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ── Ativação: remove caches desatualizados ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: Cache First para assets, Network First para navegação ─────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignora requisições não GET e requisições de extensões do browser
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  const isNavigation = request.mode === 'navigate';

  if (isNavigation) {
    // Network First para navegação — garante conteúdo atualizado
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
  } else {
    // Cache First para assets estáticos (JS, CSS, imagens)
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
  }
});
