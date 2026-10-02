/**
 * FEROX service worker — offline support.
 * App shell is cache-first (it changes only on deploy); everything else falls
 * back to the network. Bump CACHE on release to invalidate — config.js is in
 * the shell, so a Firebase config change that is not accompanied by a bump
 * will not reach anyone who has already loaded the app.
 *
 * The Firebase SDK and Firestore itself are cross-origin and fall straight
 * through the handler below untouched. Firestore keeps its own IndexedDB
 * cache and does its own offline queueing; a service worker second-guessing
 * that would be fighting it.
 */
const CACHE = 'ferox-v10.0.0';
const SHELL = [
  './', 'index.html', 'dashboard.html', 'workouts.html', 'nutrition.html',
  'progress.html', 'records.html', 'medals.html', 'friends.html', 'profile.html',
  'seasons.html', 'docs.html', 'onboarding.html',
  'manifest.webmanifest',
  'assets/css/ferox.css',
  'assets/brand/mascot.webp',
  'assets/brand/mascot.png',
  'assets/brand/icon.webp', 'assets/brand/icon.png',
  'assets/brand/favicon-16.png', 'assets/brand/favicon-32.png', 'assets/brand/favicon-48.png',
  'assets/brand/apple-touch-icon.png', 'assets/brand/maskable.png',
  'assets/brand/logo.svg', 'assets/brand/wolf.svg',
  'assets/js/core/config.js', 'assets/js/core/firebase.js', 'assets/js/core/units.js',
  'assets/js/core/social.js', 'assets/js/pages/_handle.js', 'assets/js/core/readiness-icons.js', 'u.html', 'assets/js/pages/u.js',
  'assets/js/core/icons.js', 'assets/js/core/seed.js',
  'assets/js/core/exercises.js', 'assets/js/core/anatomy.js', 'assets/js/core/strength.js',
  'assets/js/core/musclemap.js',
  'assets/js/core/store.js', 'assets/js/core/auth.js', 'assets/js/core/ui.js',
  'assets/js/core/chart.js', 'assets/js/core/seasons.js', 'assets/js/core/season-icons.js',
  'assets/js/core/profile.js', 'assets/js/core/split.js', 'assets/js/core/research.js',
  'assets/js/core/image.js', 'assets/js/core/themes.js', 'assets/js/core/eggs.js',
  'assets/js/core/metabolism.js', 'assets/js/core/plan.js',
  'assets/js/pages/landing.js', 'assets/js/pages/dashboard.js', 'assets/js/pages/workouts.js',
  'assets/js/pages/nutrition.js', 'assets/js/pages/progress.js', 'assets/js/pages/records.js',
  'assets/js/pages/medals.js', 'assets/js/pages/friends.js', 'assets/js/pages/profile.js',
  'assets/js/pages/_log.js', 'assets/js/pages/seasons.js', 'assets/js/pages/_readiness.js',
  'assets/js/pages/_weighin.js', 'assets/js/pages/_catalog.js',
  'assets/js/core/catalog.js', 'assets/js/core/foods.js', 'assets/js/core/vision.js',
  'assets/js/pages/_plate.js', 'assets/js/pages/_photo.js',
  'assets/js/pages/onboarding.js', 'assets/js/pages/docs.js',
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
