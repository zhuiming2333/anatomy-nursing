/* 离线缓存：页面/样式/脚本走「网络优先」（保证改版立刻生效），
   图片与 3D 大包走「缓存优先」（省流量、离线可看） */
var CACHE = 'anat-v10';
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

/* 这些必须联网取最新，否则用户永远停在老版本 */
function netFirst(url) {
  if (/\/$/.test(url)) return true;
  if (/\.html?$/.test(url)) return true;
  if (/\.css$/.test(url)) return true;
  if (/\/assets\/js\//.test(url) && !/m3d\.js$/.test(url)) return true;
  if (/\/sw\.js$/.test(url)) return true;
  return false;
}

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
  var url = req.url;
  if (url.indexOf('http') !== 0) return;

  if (netFirst(url)) {
    e.respondWith(
      fetch(new Request(url, { cache: 'no-cache', credentials: 'same-origin' })).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (hit) {
          if (hit) return hit;
          if (req.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 504 });
        });
      })
    );
    return;
  }

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