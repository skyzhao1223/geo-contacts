import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { authMiddleware, signToken } from '../auth.js'
import { upsertSsoUser, verifyDashboardCookie } from '../sso.js'

export const authRouter = Router()

function parseLocation(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function serializeUser(row: {
  id: string
  email: string
  display_name: string
  avatar: string | null
  bio: string | null
  birthplace: string | null
  hometown: string | null
  current_location: string | null
  last_seen_at: number | null
  created_at: number
}) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatar: row.avatar,
    bio: row.bio,
    birthplace: parseLocation(row.birthplace),
    hometown: parseLocation(row.hometown),
    currentLocation: parseLocation(row.current_location),
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  }
}

authRouter.post('/register', (req, res) => {
  const { email, password, displayName } = req.body as {
    email?: string
    password?: string
    displayName?: string
  }

  if (!email?.trim() || !password || !displayName?.trim()) {
    res.status(400).json({ error: '请填写邮箱、密码和昵称' })
    return
  }

  if (password.length < 6) {
    res.status(400).json({ error: '密码至少 6 位' })
    return
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase())
  if (existing) {
    res.status(409).json({ error: '该邮箱已注册' })
    return
  }

  const id = uuid()
  const now = Date.now()
  const passwordHash = bcrypt.hashSync(password, 10)

  db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, email.trim().toLowerCase(), passwordHash, displayName.trim(), now, now)

  const token = signToken({ userId: id, email: email.trim().toLowerCase() })
  const user = db
    .prepare(
      `SELECT id, email, display_name, avatar, bio, birthplace, hometown, current_location, last_seen_at, created_at
       FROM users WHERE id = ?`,
    )
    .get(id)

  res.json({ token, user: serializeUser(user as never) })
})

authRouter.post('/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string }

  if (!email?.trim() || !password) {
    res.status(400).json({ error: '请填写邮箱和密码' })
    return
  }

  const user = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.trim().toLowerCase()) as
    | {
        id: string
        email: string
        password_hash: string
        display_name: string
        avatar: string | null
        bio: string | null
        birthplace: string | null
        hometown: string | null
        current_location: string | null
        last_seen_at: number | null
        created_at: number
      }
    | undefined

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: '邮箱或密码错误' })
    return
  }

  const token = signToken({ userId: user.id, email: user.email })
  res.json({
    token,
    user: serializeUser(user),
  })
})

/**
 * 用 aws-infra dashboard 会话换取本应用 JWT。
 * 浏览器需带 credentials，以便转发 dashboard_session Cookie。
 */
authRouter.post('/sso', async (req, res) => {
  const identity = await verifyDashboardCookie(req.headers.cookie)
  if (!identity) {
    res.status(401).json({ error: '未登录站内账号，请先登录 zhaosky.cn' })
    return
  }

  const user = upsertSsoUser(identity)
  const token = signToken({ userId: user.id, email: user.email })
  res.json({
    token,
    user: serializeUser(user),
  })
})

authRouter.get('/me', authMiddleware, (req, res) => {
  const user = db
    .prepare(
      `SELECT id, email, display_name, avatar, bio, birthplace, hometown, current_location, last_seen_at, created_at
       FROM users WHERE id = ?`,
    )
    .get(req.auth!.userId)

  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  res.json({ user: serializeUser(user as never) })
})

authRouter.put('/profile', authMiddleware, (req, res) => {
  const {
    displayName,
    avatar,
    bio,
    birthplace,
    hometown,
    currentLocation,
  } = req.body as {
    displayName?: string
    avatar?: string
    bio?: string
    birthplace?: unknown
    hometown?: unknown
    currentLocation?: unknown
  }

  const current = db
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(req.auth!.userId) as {
      display_name: string
      avatar: string | null
      bio: string | null
      birthplace: string | null
      hometown: string | null
      current_location: string | null
    }

  db.prepare(
    `UPDATE users SET
      display_name = ?,
      avatar = ?,
      bio = ?,
      birthplace = ?,
      hometown = ?,
      current_location = ?
     WHERE id = ?`,
  ).run(
    displayName?.trim() || current.display_name,
    avatar ?? current.avatar,
    bio ?? current.bio,
    birthplace ? JSON.stringify(birthplace) : current.birthplace,
    hometown ? JSON.stringify(hometown) : current.hometown,
    currentLocation ? JSON.stringify(currentLocation) : current.current_location,
    req.auth!.userId,
  )

  const user = db
    .prepare(
      `SELECT id, email, display_name, avatar, bio, birthplace, hometown, current_location, last_seen_at, created_at
       FROM users WHERE id = ?`,
    )
    .get(req.auth!.userId)

  res.json({ user: serializeUser(user as never) })
})
