import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../auth.js'
import { isUserOnline } from '../presence.js'

export const usersRouter = Router()

function parseLocation(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function publicUser(row: {
  id: string
  display_name: string
  avatar: string | null
  bio: string | null
  birthplace: string | null
  hometown: string | null
  current_location: string | null
  last_seen_at: number | null
}) {
  return {
    id: row.id,
    displayName: row.display_name,
    avatar: row.avatar,
    bio: row.bio,
    birthplace: parseLocation(row.birthplace),
    hometown: parseLocation(row.hometown),
    currentLocation: parseLocation(row.current_location),
    lastSeenAt: row.last_seen_at,
    online: isUserOnline(row.id),
  }
}

usersRouter.get('/search', authMiddleware, (req, res) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) {
    res.json({ users: [] })
    return
  }

  const users = db
    .prepare(
      `SELECT id, display_name, avatar, bio, birthplace, hometown, current_location, last_seen_at
       FROM users
       WHERE id != ? AND (display_name LIKE ? OR email LIKE ?)
       ORDER BY display_name
       LIMIT 20`,
    )
    .all(req.auth!.userId, `%${q}%`, `%${q}%`) as Array<{
      id: string
      display_name: string
      avatar: string | null
      bio: string | null
      birthplace: string | null
      hometown: string | null
      current_location: string | null
      last_seen_at: number | null
    }>

  res.json({ users: users.map(publicUser) })
})

usersRouter.get('/:id', authMiddleware, (req, res) => {
  const user = db
    .prepare(
      `SELECT id, display_name, avatar, bio, birthplace, hometown, current_location, last_seen_at
       FROM users WHERE id = ?`,
    )
    .get(req.params.id) as
    | {
        id: string
        display_name: string
        avatar: string | null
        bio: string | null
        birthplace: string | null
        hometown: string | null
        current_location: string | null
        last_seen_at: number | null
      }
    | undefined

  if (!user) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  res.json({ user: publicUser(user) })
})
