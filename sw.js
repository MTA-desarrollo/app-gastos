/* MTA · App de Gastos — service worker
   Precarga el shell para que la app abra sin red. Los datos viven en el
   dispositivo, de modo que la app es plenamente funcional sin conexión: el
   colaborador captura en un juzgado sin señal y sincroniza después. */
var CACHE = "mtag-v1";
var SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  "./iconos/icono-192.png", "./iconos/icono-512.png",
  "./iconos/maskable-192.png", "./iconos/maskable-512.png",
  "./iconos/apple-touch-icon.png", "./iconos/favicon-32.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.allSettled(SHELL.map(function (u) { return c.add(u); }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k !== CACHE; })
                          .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Red primero para el documento, para que una versión nueva llegue al abrir.
   Caché primero para lo demás, que no cambia. */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* las tipografías van por su cuenta */

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(function (r) {
        var copia = r.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
        return r;
      }).catch(function () {
        return caches.match(req).then(function (r) { return r || caches.match("./index.html"); });
      })
    );
    return;
  }
  e.respondWith(
    caches.match(req).then(function (r) {
      return r || fetch(req).then(function (resp) {
        if (resp && resp.status === 200) {
          var copia = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copia); });
        }
        return resp;
      });
    })
  );
});
