/**
 * FEROX service worker — offline support.
 * App shell is cache-first (it changes only on deploy); everything else falls
 * back to the network. Bump CACHE on release to invalidate.
 */
const CACHE = 'ferox-v2.0.0';
const SHELL = [
  './', 'index.html', 'dashboard.html', 'workouts.html', 'nutrition.html',
  'progress.html', 'records.html', 'medals.html', 'friends.html', 'profile.html',
  'manifest.webmanifest',
  'assets/css/ferox.css',
  'assets/brand/favicon.svg', 'assets/brand/logo.svg', 'assets/brand/wolf.svg',
  'assets/js/core/config.js', 'assets/js/core/icons.js', 'assets/js/core/seed.js',
  'assets/js/core/store.js', 'assets/js/core/auth.js', 'assets/js/core/ui.js',
  'assets/js/core/chart.js',
  'assets/js/pages/landing.js', 'assets/js/pages/dashboard.js', 'assets/js/pages/workouts.js',
  'assets/js/pages/nutrition.js', 'assets/js/pages/progress.js', 'assets/js/pages/records.js',
  'assets/js/pages/medals.js', 'assets/js/pages/friends.js', 'assets/js/pages/profile.js',
  'assets/js/pages/_log.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.allSettled(SHELL.map(u => c.add(u))))  // one 404 must not fail the install
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;          // never cache Google/Fonts responses

  e.respondWith(
    caches.match(request).then(hit => hit ?? fetch(request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
      }
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
