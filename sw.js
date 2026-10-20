/* Service Worker — Preparación de Reactivos · Calidad · Embol S.A.
   Cache-first para los archivos propios (funciona sin internet).
   IMPORTANTE: sube el número de VERSION cada vez que modifiques la app. */

const VERSION = 'reactivos-v2';

const CORE = ['./', './index.html', './styles.css', './data.js', './app.js', './manifest.webmanifest'];

/* Librería para exportar a Excel y fuente. Si no se pueden guardar, la app
   igual funciona: exporta en CSV, que Excel abre sin problema. */
const CDN = [
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap'
];

async function guardarNucleo() {
  const c = await caches.open(VERSION);
  await Promise.allSettled(CORE.map(u => c.add(new Request(u, { cache: 'reload' }))));
  await Promise.allSettled(CDN.map(u => c.add(new Request(u, { mode: 'cors' }))));
}

function paginaSinConexion() {
  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Sin conexión · Reactivos</title>
<style>body{margin:0;background:#F6F7F9;color:#1A1D23;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;
display:flex;align-items:center;justify-content:center;min-height:100vh;padding:22px;box-sizing:border-box}
.c{background:#fff;border-radius:20px;padding:28px 24px;max-width:420px;text-align:center;box-shadow:0 8px 30px rgba(20,24,34,.1)}
h1{font-size:20px;margin:0 0 8px}p{color:#6A7382;font-size:14.5px;line-height:1.55}
button{background:#F40009;color:#fff;border:0;border-radius:13px;padding:14px 22px;font-weight:800;font-size:15px}</style></head>
<body><div class="c"><h1>Sin conexión</h1><p>La app todavía no se guardó en este dispositivo. Conéctate a internet una vez y ábrela de nuevo; después funcionará sin conexión.</p>
<button onclick="location.reload()">Reintentar</button></div></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', e => { e.waitUntil(guardarNucleo().then(() => self.skipWaiting())); });

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) {
        const c = await caches.open(VERSION);
        c.put(req, res.clone()).catch(() => {});
      }
      return res;
    } catch {
      if (req.mode === 'navigate') return (await caches.match('./index.html')) || paginaSinConexion();
      return new Response('', { status: 504 });
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => cs.length ? cs[0].focus() : self.clients.openWindow('./')));
});
