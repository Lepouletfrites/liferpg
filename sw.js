/* =============================================================
   sw.js — Service worker : le jeu doit rester jouable hors-ligne.
   Stratégie : network-first pour la navigation (pour ne jamais
   servir un index.html périmé), stale-while-revalidate pour le
   reste. La sauvegarde vit dans localStorage, jamais ici.
   ============================================================= */
var VERSION = 'liferpg-v4';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/data.js',
  './js/data.actions.js',
  './js/data.crime.js',
  './js/data.work.js',
  './js/data.education.js',
  './js/data.buildings.js',
  './js/data.people.js',
  './js/data.finance.js',
  './js/state.js',
  './js/engine.js',
  './js/finance.js',
  './js/buildings.js',
  './js/events.js',
  './js/probe.js',
  './js/ui.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION)
      /* addAll échoue en bloc si un seul fichier manque : on tolère les absents */
      .then(function (c) { return Promise.all(SHELL.map(function (u) { return c.add(u).catch(function () {}); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) { return k === VERSION ? null : caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // polices Google : au réseau, sans cache

  /* Navigation : réseau d'abord, cache en secours hors-ligne */
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(function (res) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put('./index.html', copy); });
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (m) { return m || caches.match('./'); });
        })
    );
    return;
  }

  /* Ressources : cache immédiat, revalidation en arrière-plan */
  e.respondWith(
    caches.match(req).then(function (cached) {
      var net = fetch(req).then(function (res) {
        if (res && res.status === 200) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      return cached || net;
    })
  );
});
