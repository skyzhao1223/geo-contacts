import webpush from 'web-push'
import { db } from './db.js'

const MAX_SUBSCRIPTIONS_PER_USER = 10
const PREVIEW_MAX_CHARS = 100
const COALESCE_MS = 15_000
const SEND_RATE_WINDOW_MS = 60_000
const SEND_RATE_MAX = 40

const vapidPublic = process.env.VAPID_PUBLIC_KEY?.trim() || ''
const vapidPrivate = process.env.VAPID_PRIVATE_KEY?.trim() || ''
const vapidSubject = process.env.VAPID_SUBJECT?.trim() || 'mailto:admin@localhost'

let configured = false

if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate)
  configured = true
} else {
  console.warn(
    '[push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not set — Web Push disabled (messages still work)',
  )
}

export function isPushConfigured(): boolean {
  return configured
}

export function getVapidPublicKey(): string | null {
  return configured ? vapidPublic : null
}

export type PushPayload = {
  type: 'chat_message' | 'friend_request' | 'friend_accepted'
  title: string
  body: string
  conversationId?: string
  url: string
  tag: string
}

type PendingCoalesce = {
  timer: ReturnType<typeof setTimeout>
  payload: PushPayload
  dirty: boolean
}

const coalesceTimers = new Map<string, PendingCoalesce>()
const sendRateBuckets = new Map<string, number[]>()

function truncatePreview(text: string, max = PREVIEW_MAX_CHARS): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function userWantsPreview(userId: string): boolean {
  const row = db
    .prepare('SELECT push_show_preview FROM users WHERE id = ?')
    .get(userId) as { push_show_preview: number } | undefined
  return row?.push_show_preview !== 0
}

function allowSendRate(userId: string): boolean {
  const now = Date.now()
  const prev = sendRateBuckets.get(userId) ?? []
  const recent = prev.filter((t) => now - t < SEND_RATE_WINDOW_MS)
  if (recent.length >= SEND_RATE_MAX) {
    sendRateBuckets.set(userId, recent)
    return false
  }
  recent.push(now)
  sendRateBuckets.set(userId, recent)
  return true
}

export function upsertPushSubscription(input: {
  userId: string
  endpoint: string
  p256dh: string
  auth: string
  userAgent?: string | null
}) {
  const now = Date.now()
  db.prepare(
    `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET
       user_id = excluded.user_id,
       p256dh = excluded.p256dh,
       auth = excluded.auth,
       user_agent = excluded.user_agent,
       created_at = excluded.created_at`,
  ).run(
    input.endpoint,
    input.userId,
    input.p256dh,
    input.auth,
    input.userAgent ?? null,
    now,
  )

  const rows = db
    .prepare(
      `SELECT endpoint FROM push_subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
    )
    .all(input.userId) as Array<{ endpoint: string }>

  if (rows.length > MAX_SUBSCRIPTIONS_PER_USER) {
    const drop = rows.slice(MAX_SUBSCRIPTIONS_PER_USER)
    const del = db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?')
    for (const row of drop) del.run(row.endpoint)
  }
}

export function deletePushSubscription(endpoint: string, userId?: string) {
  if (userId) {
    db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').run(
      endpoint,
      userId,
    )
    return
  }
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint)
}

async function deliverToUser(userId: string, payload: PushPayload) {
  if (!configured) return
  if (!allowSendRate(userId)) {
    console.warn(`[push] rate limited for user ${userId}`)
    return
  }

  const rows = db
    .prepare(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?`,
    )
    .all(userId) as Array<{ endpoint: string; p256dh: string; auth: string }>

  if (rows.length === 0) return

  const body = JSON.stringify(payload)
  if (Buffer.byteLength(body, 'utf8') > 3500) {
    console.warn('[push] payload too large, skipping')
    return
  }

  await Promise.all(
    rows.map(async (row) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth },
          },
          body,
          {
            TTL: 3600,
            urgency: 'normal',
            headers: {
              Topic: payload.tag.replace(/[^A-Za-z0-9\-_]/g, '').slice(0, 32),
            },
          },
        )
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410 || status === 401 || status === 403) {
          deletePushSubscription(row.endpoint)
          return
        }
        console.warn('[push] send failed', status ?? err)
      }
    }),
  )
}

/** Fire-and-forget with optional coalesce by tag+user (leading + trailing) */
export function sendPushToUser(userId: string, payload: PushPayload, opts?: { coalesce?: boolean }) {
  if (!configured) return

  if (!opts?.coalesce) {
    void deliverToUser(userId, payload).catch((err) => {
      console.warn('[push] deliver error', err)
    })
    return
  }

  const key = `${userId}:${payload.tag}`
  const existing = coalesceTimers.get(key)
  if (!existing) {
    void deliverToUser(userId, payload).catch((err) => {
      console.warn('[push] deliver error', err)
    })
    const timer = setTimeout(() => {
      const pending = coalesceTimers.get(key)
      coalesceTimers.delete(key)
      if (pending?.dirty) {
        void deliverToUser(userId, pending.payload).catch((err) => {
          console.warn('[push] deliver error', err)
        })
      }
    }, COALESCE_MS)
    coalesceTimers.set(key, { timer, payload, dirty: false })
    return
  }

  existing.payload = payload
  existing.dirty = true
}

export function buildChatPush(input: {
  recipientId: string
  senderName: string
  body: string
  conversationId: string
  urlBase: string
}): PushPayload {
  const showPreview = userWantsPreview(input.recipientId)
  return {
    type: 'chat_message',
    title: input.senderName,
    body: showPreview ? truncatePreview(input.body) : '发来一条消息',
    conversationId: input.conversationId,
    url: `${input.urlBase}/messages/${input.conversationId}`,
    tag: `chat:${input.conversationId}`,
  }
}

export function buildFriendRequestPush(input: {
  fromName: string
  urlBase: string
}): PushPayload {
  return {
    type: 'friend_request',
    title: '好友请求',
    body: `${input.fromName} 请求添加你为好友`,
    url: `${input.urlBase}/friends`,
    tag: 'friend_request',
  }
}

export function buildFriendAcceptedPush(input: {
  fromName: string
  urlBase: string
}): PushPayload {
  return {
    type: 'friend_accepted',
    title: '好友已添加',
    body: `${input.fromName} 已与你成为好友`,
    url: `${input.urlBase}/friends`,
    tag: 'friend_accepted',
  }
}

/** Public path prefix for notification links (no trailing slash). Empty when app is at /. */
export function pushUrlBase(): string {
  const raw = process.env.PUBLIC_PATH_PREFIX?.trim() || process.env.VITE_BASE?.trim() || ''
  if (!raw || raw === '/') {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[push] PUBLIC_PATH_PREFIX unset in production — notification deep links may miss /geo-contacts',
      )
    }
    return ''
  }
  return raw.replace(/\/$/, '')
}
