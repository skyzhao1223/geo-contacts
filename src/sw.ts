/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare let self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
void self.skipWaiting()
clientsClaim()

type PushData = {
  type?: string
  title?: string
  body?: string
  conversationId?: string
  url?: string
  tag?: string
}

function appBasePath(): string {
  const script = self.location.pathname
  if (script.endsWith('/sw.js')) {
    return script.slice(0, -'/sw.js'.length) || ''
  }
  return ''
}

function normalizeUrl(url: string | undefined): string {
  const base = appBasePath()
  if (!url) return base ? `${base}/` : '/'
  if (url.startsWith('http://') || url.startsWith('https://')) return url

  let path = url.startsWith('/') ? url : `/${url}`
  if (base && path !== base && !path.startsWith(`${base}/`)) {
    path = `${base}${path}`
  }
  return path.replace(/\/{2,}/g, '/')
}

function conversationIdFromClientUrl(url: string): string | null {
  try {
    const path = new URL(url).pathname
    const match = path.match(/\/messages\/([^/]+)\/?$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

function sameAppClient(clientUrl: string): boolean {
  const base = appBasePath()
  try {
    const path = new URL(clientUrl).pathname
    if (!base) return true
    return path === base || path.startsWith(`${base}/`)
  } catch {
    return false
  }
}

async function shouldCloseAfterShow(conversationId: string | undefined): Promise<boolean> {
  if (!conversationId) return false
  const windowClients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  })
  return windowClients.some((client) => {
    if (!('focused' in client) || !client.focused) return false
    return conversationIdFromClientUrl(client.url) === conversationId
  })
}

self.addEventListener('push', (event) => {
  const fallback: PushData = {
    title: 'GeoContacts',
    body: '你有一条新通知',
    url: `${appBasePath()}/messages`,
    tag: 'geo-contacts',
  }

  let data: PushData = fallback
  try {
    if (event.data) {
      data = { ...fallback, ...(event.data.json() as PushData) }
    }
  } catch {
    try {
      const text = event.data?.text()
      if (text) data = { ...fallback, body: text }
    } catch {
      // keep fallback
    }
  }

  const title = data.title || 'GeoContacts'
  const options: NotificationOptions = {
    body: data.body || '你有一条新通知',
    tag: data.tag || data.conversationId || 'geo-contacts',
    renotify: true,
    data: {
      url: normalizeUrl(data.url),
      conversationId: data.conversationId,
      type: data.type,
    },
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options)
      if (await shouldCloseAfterShow(data.conversationId)) {
        const notes = await self.registration.getNotifications({
          tag: options.tag,
        })
        for (const note of notes) note.close()
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = normalizeUrl(
    (event.notification.data as { url?: string } | undefined)?.url,
  )
  const absolute = new URL(targetUrl, self.location.origin).href

  event.waitUntil(
    (async () => {
      const windowClients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })

      const preferred =
        windowClients.find((c) => c.url === absolute || c.url.startsWith(`${absolute}?`)) ||
        windowClients.find((c) => sameAppClient(c.url) && 'focused' in c && c.focused) ||
        windowClients.find((c) => sameAppClient(c.url))

      if (preferred && 'focus' in preferred) {
        await preferred.focus()
        if ('navigate' in preferred) {
          try {
            await (preferred as WindowClient).navigate(absolute)
            return
          } catch {
            // fall through to openWindow
          }
        } else {
          return
        }
      }

      await self.clients.openWindow(absolute)
    })(),
  )
})

self.addEventListener('pushsubscriptionchange', (event) => {
  const changeEvent = event as ExtendableEvent & {
    oldSubscription?: PushSubscription | null
    newSubscription?: PushSubscription | null
  }

  event.waitUntil(
    (async () => {
      let sub = changeEvent.newSubscription ?? null
      if (!sub) {
        try {
          const key = changeEvent.oldSubscription?.options.applicationServerKey
          if (key) {
            sub = await self.registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: key,
            })
          }
        } catch {
          sub = null
        }
      }

      const clientsList = await self.clients.matchAll({ type: 'window' })
      const payload = sub
        ? {
            type: 'pushsubscriptionchange' as const,
            subscription: sub.toJSON(),
          }
        : { type: 'pushsubscriptionchange' as const }

      for (const client of clientsList) {
        client.postMessage(payload)
      }
    })(),
  )
})
