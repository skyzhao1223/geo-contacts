import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { db, type DbUser } from './db.js'

export interface DashboardIdentity {
  username: string
  role: string
  displayName: string
}

function dashboardAuthBase(): string {
  return (
    process.env.DASHBOARD_AUTH_BASE_URL?.replace(/\/$/, '') ||
    'http://127.0.0.1:3000'
  )
}

/** 将站内 username 映射为稳定本地邮箱 */
export function ssoEmailForUsername(username: string): string {
  const safe = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `${safe || 'user'}@zhaosky.local`
}

/**
 * 用浏览器转发来的 Cookie 校验 aws-infra dashboard 会话。
 * 优先 /api/auth/me（含展示名），失败则回退 /api/auth/verify。
 */
export async function verifyDashboardCookie(
  cookieHeader: string | undefined,
): Promise<DashboardIdentity | null> {
  if (!cookieHeader?.trim()) {
    return null
  }

  const base = dashboardAuthBase()

  try {
    const meRes = await fetch(`${base}/api/auth/me`, {
      headers: { cookie: cookieHeader, accept: 'application/json' },
      redirect: 'manual',
    })

    if (meRes.ok) {
      const payload = (await meRes.json()) as {
        username?: string
        displayName?: string
        role?: string
      }
      if (payload.username?.trim()) {
        return {
          username: payload.username.trim(),
          role: payload.role?.trim() || 'user',
          displayName: (payload.displayName || payload.username).trim(),
        }
      }
    }

    const verifyRes = await fetch(`${base}/api/auth/verify`, {
      headers: { cookie: cookieHeader },
      redirect: 'manual',
    })

    if (!verifyRes.ok) {
      return null
    }

    const username = verifyRes.headers.get('x-auth-user')?.trim()
    if (!username) {
      return null
    }

    return {
      username,
      role: verifyRes.headers.get('x-auth-role')?.trim() || 'user',
      displayName: username,
    }
  } catch (error) {
    console.warn('[sso] dashboard auth unreachable:', error)
    return null
  }
}

/** 按站内账号 upsert 本地用户（无密码登录能力） */
export function upsertSsoUser(identity: DashboardIdentity): DbUser {
  const email = ssoEmailForUsername(identity.username)
  const displayName = identity.displayName || identity.username
  const now = Date.now()

  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as
    | DbUser
    | undefined

  if (existing) {
    if (existing.display_name !== displayName) {
      db.prepare(
        'UPDATE users SET display_name = ?, last_seen_at = ? WHERE id = ?',
      ).run(displayName, now, existing.id)
      return {
        ...existing,
        display_name: displayName,
        last_seen_at: now,
      }
    }

    db.prepare('UPDATE users SET last_seen_at = ? WHERE id = ?').run(now, existing.id)
    return { ...existing, last_seen_at: now }
  }

  const id = uuid()
  // SSO 用户不可用密码登录：随机不可知哈希
  const passwordHash = bcrypt.hashSync(uuid(), 10)

  db.prepare(
    `INSERT INTO users (id, email, password_hash, display_name, created_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, email, passwordHash, displayName, now, now)

  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as DbUser
}
