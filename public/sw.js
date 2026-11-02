// Service worker do Neonposts: só avisos (push). Nada de cache, para cada publicação chegar na hora.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data.json() } catch { d = { titulo: 'Neonposts', corpo: e.data ? e.data.text() : '' } }
  e.waitUntil(self.registration.showNotification(d.titulo || 'Neonposts', {
    body: d.corpo || '',
    icon: './neonposts-icone-192.png',
    badge: './neonposts-icone-192.png',
    tag: d.tag || undefined,
    renotify: Boolean(d.tag),
    data: { url: d.url || './' },
  }))
})

// Toque no aviso: traz o app que já está aberto (e manda o endereço) ou abre um novo.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = new URL(e.notification.data && e.notification.data.url ? e.notification.data.url : './', self.registration.scope).href
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((lista) => {
    const aberta = lista.find((c) => c.url.indexOf(self.registration.scope) === 0)
    if (aberta) { aberta.postMessage({ tipo: 'abrir', url }); return aberta.focus() }
    return self.clients.openWindow(url)
  }))
})
