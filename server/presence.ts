import type { WebSocket } from 'ws'
import { verifyToken } from './auth.js'
import { db } from './db.js'

interface Client {
  userId: string
  ws: WebSocket
  lastHeartbeat: number
}

const clients = new Map<string, Set<Client>>()
const onlineUsers = new Set<string>()

function getFriendIds(userId: string): string[] {
  const rows = db
    .prepare(
      `SELECT requester_id, addressee_id FROM friendships
       WHERE status = 'accepted' AND (requester_id = ? OR addressee_id = ?)`,
    )
    .all(userId, userId) as Array<{ requester_id: string; addressee_id: string }>

  return rows.map((row) =>
    row.requester_id === userId ? row.addressee_id : row.requester_id,
  )
}

function broadcastPresence(userId: string, online: boolean) {
  const friendIds = getFriendIds(userId)
  const payload = JSON.stringify({
    type: 'presence',
    userId,
    online,
    lastSeenAt: Date.now(),
  })

  for (const friendId of friendIds) {
    const friendClients = clients.get(friendId)
    if (!friendClients) continue
    for (const client of friendClients) {
      if (client.ws.readyState === 1) {
        client.ws.send(payload)
      }
    }
  }
}

function setUserOnline(userId: string) {
  const wasOnline = onlineUsers.has(userId)
  onlineUsers.add(userId)
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(Date.now(), userId)
  if (!wasOnline) {
    broadcastPresence(userId, true)
  }
}

function setUserOffline(userId: string) {
  if (!onlineUsers.has(userId)) return
  onlineUsers.delete(userId)
  db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(Date.now(), userId)
  broadcastPresence(userId, false)
}

function addClient(userId: string, ws: WebSocket) {
  const client: Client = { userId, ws, lastHeartbeat: Date.now() }
  const set = clients.get(userId) ?? new Set<Client>()
  set.add(client)
  clients.set(userId, set)
  setUserOnline(userId)
}

function removeClient(userId: string, ws: WebSocket) {
  const set = clients.get(userId)
  if (!set) return
  for (const client of set) {
    if (client.ws === ws) {
      set.delete(client)
      break
    }
  }
  if (set.size === 0) {
    clients.delete(userId)
    setUserOffline(userId)
  }
}

export function handlePresenceConnection(ws: WebSocket, token: string | null) {
  if (!token) {
    ws.close(4001, '未授权')
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    ws.close(4001, '无效 token')
    return
  }

  const userId = payload.userId
  addClient(userId, ws)

  const friendIds = getFriendIds(userId)
  const onlineSnapshot = friendIds.map((friendId) => ({
    userId: friendId,
    online: onlineUsers.has(friendId),
    lastSeenAt:
      (
        db.prepare('SELECT last_seen_at FROM users WHERE id = ?').get(friendId) as
          | { last_seen_at: number | null }
          | undefined
      )?.last_seen_at ?? null,
  }))

  ws.send(
    JSON.stringify({
      type: 'snapshot',
      onlineUsers: onlineSnapshot,
    }),
  )

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString()) as { type?: string }
      if (message.type === 'heartbeat') {
        const set = clients.get(userId)
        if (!set) return
        for (const client of set) {
          if (client.ws === ws) {
            client.lastHeartbeat = Date.now()
          }
        }
        setUserOnline(userId)
        ws.send(JSON.stringify({ type: 'heartbeat_ack' }))
      }
    } catch {
      // ignore malformed messages
    }
  })

  ws.on('close', () => {
    removeClient(userId, ws)
  })
}

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId)
}

export function getOnlineUserIds(): string[] {
  return [...onlineUsers]
}

/** 向某用户的所有连接推送 JSON 字符串 */
export function sendToUser(userId: string, payload: string) {
  const set = clients.get(userId)
  if (!set) return
  for (const client of set) {
    if (client.ws.readyState === 1) {
      client.ws.send(payload)
    }
  }
}

setInterval(() => {
  const now = Date.now()
  for (const [userId, set] of clients.entries()) {
    for (const client of [...set]) {
      if (now - client.lastHeartbeat > 90_000) {
        client.ws.terminate()
        removeClient(userId, client.ws)
      }
    }
  }
}, 30_000)
