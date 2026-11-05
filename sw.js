/* Lexi service worker
   - غيّر رقم VERSION لما تحب تجبر كل الأجهزة تمسح الكاش القديم.
   - ملفات التطبيق: الأول من النت (أحدث نسخة)، ولو أوفلاين من الكاش.
   - خطوط جوجل: تتخزن وتشتغل أوفلاين.
   - الإعلانات والموارد الخارجية التانية: بتعدي من غير تدخل. */
const VERSION = 'lexi-v4';
const APP_CACHE = VERSION + '-app';
const FONT_CACHE = 'lexi-fonts-v1';
const PRECACHE = ['./', './index.html', './manifest.json', './icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(APP_CACHE);
    await Promise.all(PRECACHE.map(u => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== APP_CACHE && k !== FONT_CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(networkFirst(req));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(staleWhileRevalidate(req));
  }
});

async function networkFirst(req) {
  const cache = await caches.open(APP_CACHE);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res && res.status === 200) cache.put(req, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const idx = (await cache.match('./index.html')) || (await cache.match('./'));
      if (idx) return idx;
    }
    throw err;
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(FONT_CACHE);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if (res && (res.status === 200 || res.type === 'opaque')) cache.put(req, res.clone()).catch(() => {});
    return res;
  }).catch(() => hit);
  return hit || net;
}