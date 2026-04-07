/* ═══════════════════════════════════════════════════════════════════
   NOVA CRM — Service Worker
   Cache-first para estáticos, network-first para API
   ═══════════════════════════════════════════════════════════════════ */

const CACHE = 'nova-crm-v1'
const STATIC = [
  '/login.html',
  '/admin.html',
  '/crm.html',
  '/administraciones.html',
  '/finanzas.html',
  '/documentos.html',
  '/usuarios.html',
  '/nova-premium.css',
  '/manifest.json',
  '/icons/icon.svg'
]

// Instalar — cachea el shell de la app
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

// Activar — limpia caches viejos
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch — network-first para API, cache-first para estáticos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // API y webhooks → siempre red
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/webhook/')) {
    e.respondWith(fetch(e.request))
    return
  }

  // Supabase CDN → siempre red
  if (url.hostname.includes('supabase') || url.hostname.includes('cdn.jsdelivr')) {
    e.respondWith(fetch(e.request))
    return
  }

  // Estáticos → cache-first con fallback a red
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(res => {
        if (res && res.status === 200 && e.request.method === 'GET') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})
