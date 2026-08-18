import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../auth.js'
import {
  deletePushSubscription,
  getVapidPublicKey,
  isPushConfigured,
  upsertPushSubscription,
} from '../push.js'

export const pushRouter = Router()

pushRouter.get('/vapid-public-key', (_req, res) => {
  const key = getVapidPublicKey()
  if (!key) {
    res.status(503).json({ error: '推送未配置', configured: false })
    return
  }
  res.json({ publicKey: key, configured: true })
})

pushRouter.get('/status', authMiddleware, (req, res) => {
  const user = db
    .prepare('SELECT push_show_preview FROM users WHERE id = ?')
    .get(req.auth!.userId) as { push_show_preview: number } | undefined

  res.json({
    configured: isPushConfigured(),
    pushShowPreview: user?.push_show_preview !== 0,
  })
})

pushRouter.post('/subscribe', authMiddleware, (req, res) => {
  if (!isPushConfigured()) {
    res.status(503).json({ error: '推送未配置' })
    return
  }

  const { endpoint, keys } = req.body as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }

  if (!endpoint?.trim() || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ error: '订阅信息不完整' })
    return
  }

  upsertPushSubscription({
    userId: req.auth!.userId,
    endpoint: endpoint.trim(),
    p256dh: keys.p256dh,
    auth: keys.auth,
    userAgent: req.headers['user-agent'] ?? null,
  })

  res.json({ ok: true })
})

pushRouter.delete('/subscribe', authMiddleware, (req, res) => {
  const endpoint =
    typeof req.body?.endpoint === 'string'
      ? req.body.endpoint.trim()
      : typeof req.query.endpoint === 'string'
        ? req.query.endpoint.trim()
        : ''

  if (!endpoint) {
    res.status(400).json({ error: '请提供 endpoint' })
    return
  }

  deletePushSubscription(endpoint, req.auth!.userId)
  res.json({ ok: true })
})

pushRouter.patch('/preferences', authMiddleware, (req, res) => {
  const { pushShowPreview } = req.body as { pushShowPreview?: boolean }
  if (typeof pushShowPreview !== 'boolean') {
    res.status(400).json({ error: '请提供 pushShowPreview' })
    return
  }

  db.prepare('UPDATE users SET push_show_preview = ? WHERE id = ?').run(
    pushShowPreview ? 1 : 0,
    req.auth!.userId,
  )

  res.json({ ok: true, pushShowPreview })
})
