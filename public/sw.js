/* ═══════════════════════════════════════════════════════════════════
   NOVA CRM — Service Worker v2
   HTML: siempre red | CSS/íconos: cache
   ═══════════════════════════════════════════════════════════════════ */

const CACHE = 'nova-crm-v2'

// Solo cachear assets estáticos puros — NUNCA HTML
const STATIC = [
  '/nova-premium.css',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/broker-icon-192.png',
  '/icons/broker-icon-512.png'
]

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.allSettled(STATIC.map(s => c.add(s))))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  // Solo interceptar peticiones GET del mismo origen
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)

  // Cualquier cosa fuera del mismo origen → dejar pasar sin tocar
  if (url.origin !== self.location.origin) return

  // HTML (navegación entre páginas) → SIEMPRE red, nunca cache
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/login.html')))
    return
  }

  // API y webhooks → siempre red
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/webhook/')) return

  // Manifest → siempre red (es dinámico)
  if (url.pathname === '/manifest.json') return

  // CSS e íconos → cache-first, actualiza en background
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})
