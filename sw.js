/* Catch the Coin - service worker (PWA) */
const VERSION = "1.6.0";
const CACHE = "catch-the-coin-" + VERSION;

const ASSETS = [
  "./",
  "index.html",
  "style.css",
  "game.js",
  "manifest.json",
  "Assets/player.png",
  "Assets/player_green.png",
  "Assets/player_pink.png",
  "Assets/coin.png",
  "Assets/bat.png",
  "Assets/music_menu.mp3",
  "Assets/music_game.mp3",
  "Assets/icon-192.png",
  "Assets/icon-512.png",
  "Assets/icon-maskable-512.png"
];

// Installazione: salva tutti i file nella cache della nuova versione
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          ASSETS.map((url) =>
            cache
              .add(new Request(url, { cache: "reload" }))
              .catch((err) => console.warn("SW: not cached", url, err))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

// Attivazione: elimina le cache delle versioni precedenti
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("catch-the-coin-") && k !== CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Le musiche vengono richieste "a pezzi" (Range): rispondiamo con la parte giusta del file in cache
async function rangedResponse(request, response) {
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  if (!range) return response;
  const buffer = await response.arrayBuffer();
  const total = buffer.byteLength;
  const start = range[1] === "" ? 0 : Number(range[1]);
  const end = range[2] === "" ? total - 1 : Math.min(Number(range[2]), total - 1);
  if (start > end || start >= total) {
    return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + total } });
  }
  return new Response(buffer.slice(start, end + 1), {
    status: 206,
    statusText: "Partial Content",
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "application/octet-stream",
      "Content-Range": "bytes " + start + "-" + end + "/" + total,
      "Content-Length": String(end - start + 1)
    }
  });
}

// Prima la cache, poi la rete. I parametri ?v=... e ?debug vengono ignorati nel confronto.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return request.headers.has("range") ? rangedResponse(request, cached) : cached;
      try {
        const response = await fetch(request);
        if (response.ok && response.status === 200 && !request.headers.has("range")) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      } catch (err) {
        if (request.mode === "navigate") {
          const fallback = await caches.match("index.html");
          if (fallback) return fallback;
        }
        return Response.error();
      }
    })()
  );
});
