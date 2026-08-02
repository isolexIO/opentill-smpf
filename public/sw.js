// Minimal service worker for offline app-shell navigation fallback.
const CACHE = 'smpf-wallet-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() =>
        caches.open(CACHE).then((c) =>
          c.match('/SMPFWallet').then((r) => r || new Response('Offline — openTILL SMPF Wallet is unavailable.', { status: 503 }))
        )
      )
    );
  }
});
