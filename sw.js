/* 离线缓存：先缓存后网络，图片走运行时缓存 */
var CACHE = 'anat-v7';
var CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './favicon.svg',
  './assets/css/app.css',
  './assets/css/theme.css',
  './assets/js/app.js',
  './assets/js/data/core.js',
  './assets/js/data/terms.js',
  './assets/js/data/qa.js',
  './assets/js/data/mcq.js',
  './assets/js/data/fill.js',
  './assets/js/data/vocab.js',
  './assets/js/data/images.js',
  './assets/js/data/lecture.js',
  './assets/vendor/three.min.js',
  './assets/js/viewer3d.js'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(CORE.map(function (u) {
      return c.add(new Request(u, { cache: 'reload' })).catch(function () {});
    }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && res.status === 200 && res.type === 'basic') {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      if (req.mode === 'navigate') return caches.match('./index.html');
      return new Response('', { status: 504 });
    });
  }));
});
