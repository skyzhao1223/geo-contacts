import { api, getToken, sitePrefix } from '@/lib/api'

const PENDING_SUB_KEY = 'geo-contacts-pending-push-sub'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

function applicationServerKeyEquals(
  existing: PushSubscription,
  publicKey: string,
): boolean {
  const want = urlBase64ToUint8Array(publicKey)
  const got = existing.options.applicationServerKey
  if (!got) return false
  const gotBytes = new Uint8Array(got)
  if (gotBytes.byteLength !== want.byteLength) return false
  return gotBytes.every((b, i) => b === want[i])
}

export function isStandaloneDisplay(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return Boolean(nav.standalone)
}

export function isIosDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

async function reportSubscription(sub: PushSubscription): Promise<void> {
  const json = sub.toJSON()
  await api.subscribePush({
    endpoint: sub.endpoint,
    keys: {
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    },
  })
}

/** Flush subscription queued by SW while app was closed */
export async function flushPendingPushSubscription(): Promise<void> {
  try {
    const raw = localStorage.getItem(PENDING_SUB_KEY)
    if (!raw || !getToken()) return
    const parsed = JSON.parse(raw) as {
      endpoint?: string
      keys?: { p256dh?: string; auth?: string }
    }
    if (!parsed.endpoint || !parsed.keys?.p256dh || !parsed.keys?.auth) {
      localStorage.removeItem(PENDING_SUB_KEY)
      return
    }
    await api.subscribePush({
      endpoint: parsed.endpoint,
      keys: { p256dh: parsed.keys.p256dh, auth: parsed.keys.auth },
    })
    localStorage.removeItem(PENDING_SUB_KEY)
  } catch {
    // keep pending for next login
  }
}

export function stashPendingPushSubscription(subscriptionJson: {
  endpoint: string
  keys?: { p256dh?: string; auth?: string }
}): void {
  try {
    localStorage.setItem(PENDING_SUB_KEY, JSON.stringify(subscriptionJson))
  } catch {
    // ignore quota
  }
}

export async function syncPushSubscription(): Promise<
  'ok' | 'denied' | 'unsupported' | 'unavailable'
> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'

  let status: Awaited<ReturnType<typeof api.pushStatus>>
  try {
    status = await api.pushStatus()
  } catch {
    return 'unavailable'
  }
  if (!status.configured) return 'unavailable'

  if (Notification.permission !== 'granted') return 'denied'

  await flushPendingPushSubscription()

  const reg = await getPushRegistration()
  if (!reg) return 'unavailable'

  const { publicKey } = await api.getVapidPublicKey()
  let sub = await reg.pushManager.getSubscription()
  if (sub && !applicationServerKeyEquals(sub, publicKey)) {
    try {
      await api.unsubscribePush(sub.endpoint)
    } catch {
      // ignore
    }
    await sub.unsubscribe()
    sub = null
  }
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    })
  }

  await reportSubscription(sub)
  return 'ok'
}

export async function enablePushNotifications(): Promise<
  'ok' | 'denied' | 'unsupported' | 'unavailable' | 'need_install'
> {
  if (!pushSupported()) return 'unsupported'
  if (isIosDevice() && !isStandaloneDisplay()) return 'need_install'

  let status: Awaited<ReturnType<typeof api.pushStatus>>
  try {
    status = await api.pushStatus()
  } catch {
    return 'unavailable'
  }
  if (!status.configured) return 'unavailable'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'denied'

  return syncPushSubscription()
}

export async function hasActivePushSubscription(): Promise<boolean> {
  const reg = await getPushRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return Boolean(sub)
}

export async function disablePushNotifications(): Promise<void> {
  await teardownPushOnLogout()
}

/**
 * Tear down push for the *current* session.
 * Captures token/endpoint up front so a later login cannot race-delete the new user's sub.
 */
export async function teardownPushOnLogout(): Promise<void> {
  const token = getToken()
  const reg = await getPushRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return

  const endpoint = sub.endpoint
  if (token) {
    try {
      await api.unsubscribePush(endpoint, token)
    } catch {
      // still drop local subscription
    }
  }
  try {
    await sub.unsubscribe()
  } catch {
    // ignore
  }
}

export function deepLinkPath(path: string): string {
  const prefix = sitePrefix()
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${prefix}${normalized}` || normalized
}
