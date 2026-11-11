/* Service worker: guarda o app no aparelho para abrir sem internet.
   Estratégia: responde do cache e atualiza em segundo plano (a nova versão aparece na abertura seguinte).
   Para forçar atualização após mudar arquivos, aumente o número em CACHE. */
var CACHE = "chamada-v1";
var ASSETS = [
  "./", "index.html", "config.js", "manifest.json",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // chamadas ao Apps Script passam direto

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (cached) {
        var net = fetch(req).then(function (res) {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(function () { return null; });
        if (cached) { e.waitUntil(net); return cached; }
        return net.then(function (res) {
          if (res) return res;
          if (req.mode === "navigate") return cache.match("./");
          return new Response("Offline", { status: 503 });
        });
      });
    })
  );
});
