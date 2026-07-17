import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../auth.js'
import { isUserOnline, sendToUser } from '../presence.js'

export const messagesRouter = Router()

const MAX_BODY_LENGTH = 2000

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

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a]
}

function areFriends(userA: string, userB: string): boolean {
  const row = db
    .prepare(
      `SELECT id FROM friendships
       WHERE status = 'accepted'
         AND ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))`,
    )
    .get(userA, userB, userB, userA)
  return Boolean(row)
}

function getConversationForUser(conversationId: string, userId: string) {
  return db
    .prepare(
      `SELECT * FROM conversations
       WHERE id = ? AND (user_a = ? OR user_b = ?)`,
    )
    .get(conversationId, userId, userId) as
    | {
        id: string
        user_a: string
        user_b: string
        last_message_at: number | null
        last_message_body: string | null
        created_at: number
      }
    | undefined
}

function peerId(conversation: { user_a: string; user_b: string }, userId: string) {
  return conversation.user_a === userId ? conversation.user_b : conversation.user_a
}

function unreadCount(conversationId: string, userId: string, lastMessageAt: number | null) {
  if (!lastMessageAt) return 0
  const read = db
    .prepare(
      `SELECT last_read_at FROM conversation_reads
       WHERE conversation_id = ? AND user_id = ?`,
    )
    .get(conversationId, userId) as { last_read_at: number } | undefined

  const since = read?.last_read_at ?? 0
  const row = db
    .prepare(
      `SELECT COUNT(*) as count FROM messages
       WHERE conversation_id = ? AND created_at > ? AND sender_id != ?`,
    )
    .get(conversationId, since, userId) as { count: number }
  return row.count
}

messagesRouter.get('/conversations', authMiddleware, (req, res) => {
  const userId = req.auth!.userId
  const rows = db
    .prepare(
      `SELECT c.*,
              u.id as peer_id, u.display_name, u.avatar, u.bio,
              u.birthplace, u.hometown, u.current_location, u.last_seen_at
       FROM conversations c
       JOIN users u ON u.id = CASE WHEN c.user_a = ? THEN c.user_b ELSE c.user_a END
       WHERE c.user_a = ? OR c.user_b = ?
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC`,
    )
    .all(userId, userId, userId) as Array<{
      id: string
      user_a: string
      user_b: string
      last_message_at: number | null
      last_message_body: string | null
      created_at: number
      peer_id: string
      display_name: string
      avatar: string | null
      bio: string | null
      birthplace: string | null
      hometown: string | null
      current_location: string | null
      last_seen_at: number | null
    }>

  res.json({
    conversations: rows.map((row) => {
      const canMessage = areFriends(userId, row.peer_id)
      return {
        id: row.id,
        peer: publicUser({
          id: row.peer_id,
          display_name: row.display_name,
          avatar: row.avatar,
          bio: row.bio,
          birthplace: row.birthplace,
          hometown: row.hometown,
          current_location: row.current_location,
          last_seen_at: row.last_seen_at,
        }),
        lastMessageAt: row.last_message_at,
        lastMessageBody: row.last_message_body,
        unreadCount: unreadCount(row.id, userId, row.last_message_at),
        canMessage,
        createdAt: row.created_at,
      }
    }),
  })
})

messagesRouter.post('/conversations', authMiddleware, (req, res) => {
  const userId = req.auth!.userId
  const { peerUserId } = req.body as { peerUserId?: string }
  if (!peerUserId) {
    res.status(400).json({ error: '请指定对方用户' })
    return
  }
  if (peerUserId === userId) {
    res.status(400).json({ error: '不能和自己聊天' })
    return
  }

  const peer = db
    .prepare(
      `SELECT id, display_name, avatar, bio, birthplace, hometown, current_location, last_seen_at
       FROM users WHERE id = ?`,
    )
    .get(peerUserId) as
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

  if (!peer) {
    res.status(404).json({ error: '用户不存在' })
    return
  }

  if (!areFriends(userId, peerUserId)) {
    res.status(403).json({ error: '仅好友可发起私信' })
    return
  }

  const [userA, userB] = orderedPair(userId, peerUserId)
  let conversation = db
    .prepare('SELECT * FROM conversations WHERE user_a = ? AND user_b = ?')
    .get(userA, userB) as
    | {
        id: string
        user_a: string
        user_b: string
        last_message_at: number | null
        last_message_body: string | null
        created_at: number
      }
    | undefined

  if (!conversation) {
    const id = uuid()
    const now = Date.now()
    db.prepare(
      `INSERT INTO conversations (id, user_a, user_b, last_message_at, last_message_body, created_at)
       VALUES (?, ?, ?, NULL, NULL, ?)`,
    ).run(id, userA, userB, now)
    conversation = {
      id,
      user_a: userA,
      user_b: userB,
      last_message_at: null,
      last_message_body: null,
      created_at: now,
    }
  }

  res.json({
    conversation: {
      id: conversation.id,
      peer: publicUser(peer),
      lastMessageAt: conversation.last_message_at,
      lastMessageBody: conversation.last_message_body,
      unreadCount: unreadCount(conversation.id, userId, conversation.last_message_at),
      canMessage: true,
      createdAt: conversation.created_at,
    },
  })
})

messagesRouter.get('/conversations/:id/messages', authMiddleware, (req, res) => {
  const userId = req.auth!.userId
  const conversation = getConversationForUser(req.params.id, userId)
  if (!conversation) {
    res.status(404).json({ error: '会话不存在' })
    return
  }

  const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100)
  const before = req.query.before ? Number(req.query.before) : undefined

  const rows = before
    ? (db
        .prepare(
          `SELECT * FROM messages
           WHERE conversation_id = ? AND created_at < ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(conversation.id, before, limit) as Array<{
          id: string
          conversation_id: string
          sender_id: string
          body: string
          created_at: number
        }>)
    : (db
        .prepare(
          `SELECT * FROM messages
           WHERE conversation_id = ?
           ORDER BY created_at DESC LIMIT ?`,
        )
        .all(conversation.id, limit) as Array<{
          id: string
          conversation_id: string
          sender_id: string
          body: string
          created_at: number
        }>)

  res.json({
    messages: rows
      .map((row) => ({
        id: row.id,
        conversationId: row.conversation_id,
        senderId: row.sender_id,
        body: row.body,
        createdAt: row.created_at,
      }))
      .reverse(),
  })
})

messagesRouter.post('/conversations/:id/messages', authMiddleware, (req, res) => {
  const userId = req.auth!.userId
  const conversation = getConversationForUser(req.params.id, userId)
  if (!conversation) {
    res.status(404).json({ error: '会话不存在' })
    return
  }

  const otherId = peerId(conversation, userId)
  if (!areFriends(userId, otherId)) {
    res.status(403).json({ error: '已不是好友，无法发送消息' })
    return
  }

  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
  if (!body) {
    res.status(400).json({ error: '消息不能为空' })
    return
  }
  if (body.length > MAX_BODY_LENGTH) {
    res.status(400).json({ error: `消息最长 ${MAX_BODY_LENGTH} 字` })
    return
  }

  const id = uuid()
  const now = Date.now()
  db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_id, body, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, conversation.id, userId, body, now)

  db.prepare(
    `UPDATE conversations SET last_message_at = ?, last_message_body = ? WHERE id = ?`,
  ).run(now, body, conversation.id)

  db.prepare(
    `INSERT INTO conversation_reads (conversation_id, user_id, last_read_at)
     VALUES (?, ?, ?)
     ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  ).run(conversation.id, userId, now)

  const message = {
    id,
    conversationId: conversation.id,
    senderId: userId,
    body,
    createdAt: now,
  }

  const payload = JSON.stringify({
    type: 'chat_message',
    conversationId: conversation.id,
    message,
  })
  sendToUser(userId, payload)
  sendToUser(otherId, payload)

  res.json({ message })
})

messagesRouter.post('/conversations/:id/read', authMiddleware, (req, res) => {
  const userId = req.auth!.userId
  const conversation = getConversationForUser(req.params.id, userId)
  if (!conversation) {
    res.status(404).json({ error: '会话不存在' })
    return
  }

  const now = Date.now()
  db.prepare(
    `INSERT INTO conversation_reads (conversation_id, user_id, last_read_at)
     VALUES (?, ?, ?)
     ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at`,
  ).run(conversation.id, userId, now)

  const otherId = peerId(conversation, userId)
  sendToUser(
    otherId,
    JSON.stringify({
      type: 'chat_read',
      conversationId: conversation.id,
      userId,
      lastReadAt: now,
    }),
  )

  res.json({ ok: true, lastReadAt: now })
})

messagesRouter.get('/unread-count', authMiddleware, (req, res) => {
  const userId = req.auth!.userId
  const rows = db
    .prepare(
      `SELECT id, last_message_at FROM conversations
       WHERE user_a = ? OR user_b = ?`,
    )
    .all(userId, userId) as Array<{ id: string; last_message_at: number | null }>

  const total = rows.reduce(
    (sum, row) => sum + unreadCount(row.id, userId, row.last_message_at),
    0,
  )
  res.json({ unreadCount: total })
})
