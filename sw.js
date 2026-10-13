/* Service worker : visites suivantes quasi instantanées + page hors ligne.
   Pages, CSS et JS : réseau d'abord (toujours à jour), cache en secours.
   Images et polices (/assets/) : cache d'abord.
   Pensez à incrémenter VERSION quand un fichier de /assets/ change. */
const VERSION = 'ratnco-v1';
const PRECACHE = [
  './', 'index.html', 'offline.html', 'css/style.css', 'manifest.webmanifest',
  'js/main.js', 'js/config.js', 'js/core.js', 'js/background.js', 'js/hud.js', 'js/menus.js',
  'js/live.js', 'js/sections.js', 'js/fun.js', 'js/commands.js', 'js/skin.js',
  'assets/fonts/ratcraft.woff2', 'assets/fonts/ratcraft-bold.woff2',
  'assets/img/logo.png', 'assets/img/icons.png', 'assets/img/block.png', 'assets/img/tnt.png',
  'assets/img/skin.png', 'assets/img/cursor.png', 'assets/img/cursor-pointer.png',
  'assets/img/favicon-32.png',
  'assets/img/tex/button.png', 'assets/img/tex/button_twitch.png', 'assets/img/tex/dirt.png',
  'assets/img/tex/dirt_dark.png', 'assets/img/tex/grass_side.png', 'assets/img/tex/stone.png',
  'assets/img/tex/deepslate.png', 'assets/img/tex/bedrock.png', 'assets/img/tex/planks.png',
  'assets/img/scenes/jour.png', 'assets/img/scenes/coucher.png', 'assets/img/scenes/nuit.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => Promise.all(PRECACHE.map((u) => c.add(u).catch(() => null)))));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        if (res.ok) caches.open(VERSION).then((c) => c.put('index.html', copy));
        return res;
      }).catch(async () => (await caches.match(req)) || (await caches.match('index.html')) || caches.match('offline.html'))
    );
    return;
  }

  if (url.pathname.includes('/assets/')) {
    e.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req))
  );
});
