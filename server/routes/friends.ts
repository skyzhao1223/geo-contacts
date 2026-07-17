import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../auth.js'
import { isUserOnline } from '../presence.js'

export const friendsRouter = Router()

function parseLocation(value: string | null) {
  if (!value) return null
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function friendUser(row: {
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

friendsRouter.get('/', authMiddleware, (req, res) => {
  const rows = db
    .prepare(
      `SELECT f.id as friendship_id, f.created_at as friendship_created_at,
              u.id, u.display_name, u.avatar, u.bio, u.birthplace, u.hometown, u.current_location, u.last_seen_at
       FROM friendships f
       JOIN users u ON u.id = CASE WHEN f.requester_id = ? THEN f.addressee_id ELSE f.requester_id END
       WHERE f.status = 'accepted' AND (f.requester_id = ? OR f.addressee_id = ?)
       ORDER BY u.display_name`,
    )
    .all(req.auth!.userId, req.auth!.userId, req.auth!.userId) as Array<{
      friendship_id: string
      friendship_created_at: number
      id: string
      display_name: string
      avatar: string | null
      bio: string | null
      birthplace: string | null
      hometown: string | null
      current_location: string | null
      last_seen_at: number | null
    }>

  res.json({
    friends: rows.map((row) => ({
      friendshipId: row.friendship_id,
      since: row.friendship_created_at,
      user: friendUser(row),
    })),
  })
})

friendsRouter.get('/requests', authMiddleware, (req, res) => {
  const incoming = db
    .prepare(
      `SELECT f.id as friendship_id, f.created_at,
              u.id, u.display_name, u.avatar, u.bio, u.birthplace, u.hometown, u.current_location, u.last_seen_at
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       WHERE f.status = 'pending' AND f.addressee_id = ?
       ORDER BY f.created_at DESC`,
    )
    .all(req.auth!.userId) as Array<{
      friendship_id: string
      created_at: number
      id: string
      display_name: string
      avatar: string | null
      bio: string | null
      birthplace: string | null
      hometown: string | null
      current_location: string | null
      last_seen_at: number | null
    }>

  const outgoing = db
    .prepare(
      `SELECT f.id as friendship_id, f.created_at,
              u.id, u.display_name, u.avatar, u.bio, u.birthplace, u.hometown, u.current_location, u.last_seen_at
       FROM friendships f
       JOIN users u ON u.id = f.addressee_id
       WHERE f.status = 'pending' AND f.requester_id = ?
       ORDER BY f.created_at DESC`,
    )
    .all(req.auth!.userId) as typeof incoming

  res.json({
    incoming: incoming.map((row) => ({
      friendshipId: row.friendship_id,
      createdAt: row.created_at,
      user: friendUser(row),
    })),
    outgoing: outgoing.map((row) => ({
      friendshipId: row.friendship_id,
      createdAt: row.created_at,
      user: friendUser(row),
    })),
  })
})

friendsRouter.post('/request', authMiddleware, (req, res) => {
  const { userId } = req.body as { userId?: string }
  if (!userId) {
    res.status(400).json({ error: '请指定用户' })
    return
  }

  if (userId === req.auth!.userId) {
    res.status(400).json({ error: '不能添加自己为好友' })
    return
  }

  const target = db.prepare('SELECT id FROM users WHERE id = ?').get(userId)
  if (!target) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  const existing = db
    .prepare(
      `SELECT id, status, requester_id, addressee_id FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)`,
    )
    .get(req.auth!.userId, userId, userId, req.auth!.userId) as
    | { id: string; status: string; requester_id: string; addressee_id: string }
    | undefined

  if (existing) {
    if (existing.status === 'accepted') {
      res.status(409).json({ error: '你们已经是好友了' })
      return
    }
    if (existing.status === 'pending') {
      if (existing.requester_id === userId) {
        db.prepare(`UPDATE friendships SET status = 'accepted', updated_at = ? WHERE id = ?`).run(
          Date.now(),
          existing.id,
        )
        res.json({ friendshipId: existing.id, status: 'accepted', autoAccepted: true })
        return
      }
      res.status(409).json({ error: '好友请求已发送，等待对方确认' })
      return
    }
  }

  const id = uuid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(id, req.auth!.userId, userId, now, now)

  res.json({ friendshipId: id, status: 'pending' })
})

friendsRouter.post('/accept', authMiddleware, (req, res) => {
  const { friendshipId } = req.body as { friendshipId?: string }
  if (!friendshipId) {
    res.status(400).json({ error: '请指定好友请求' })
    return
  }

  const friendship = db
    .prepare('SELECT * FROM friendships WHERE id = ?')
    .get(friendshipId) as
    | { id: string; addressee_id: string; status: string }
    | undefined

  if (!friendship) {
    res.status(404).json({ error: '好友请求不存在' })
    return
  }

  if (friendship.addressee_id !== req.auth!.userId) {
    res.status(403).json({ error: '无权处理该请求' })
    return
  }

  db.prepare(`UPDATE friendships SET status = 'accepted', updated_at = ? WHERE id = ?`).run(
    Date.now(),
    friendshipId,
  )

  res.json({ friendshipId, status: 'accepted' })
})

friendsRouter.post('/reject', authMiddleware, (req, res) => {
  const { friendshipId } = req.body as { friendshipId?: string }
  if (!friendshipId) {
    res.status(400).json({ error: '请指定好友请求' })
    return
  }

  const friendship = db
    .prepare('SELECT * FROM friendships WHERE id = ?')
    .get(friendshipId) as
    | { id: string; addressee_id: string; status: string }
    | undefined

  if (!friendship) {
    res.status(404).json({ error: '好友请求不存在' })
    return
  }

  if (friendship.addressee_id !== req.auth!.userId) {
    res.status(403).json({ error: '无权处理该请求' })
    return
  }

  db.prepare(`UPDATE friendships SET status = 'rejected', updated_at = ? WHERE id = ?`).run(
    Date.now(),
    friendshipId,
  )

  res.json({ friendshipId, status: 'rejected' })
})

friendsRouter.delete('/:friendshipId', authMiddleware, (req, res) => {
  const friendship = db
    .prepare('SELECT * FROM friendships WHERE id = ?')
    .get(req.params.friendshipId) as
    | { id: string; requester_id: string; addressee_id: string }
    | undefined

  if (!friendship) {
    res.status(404).json({ error: '好友关系不存在' })
    return
  }

  if (
    friendship.requester_id !== req.auth!.userId &&
    friendship.addressee_id !== req.auth!.userId
  ) {
    res.status(403).json({ error: '无权删除该好友关系' })
    return
  }

  db.prepare('DELETE FROM friendships WHERE id = ?').run(req.params.friendshipId)
  res.json({ ok: true })
})
