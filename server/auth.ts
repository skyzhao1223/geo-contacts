import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const isProd = process.env.NODE_ENV === 'production'
const JWT_SECRET = process.env.JWT_SECRET ?? (isProd ? '' : 'geo-contacts-dev-secret-change-me')

if (isProd && !process.env.JWT_SECRET) {
  console.error('[auth] 生产环境必须设置 JWT_SECRET 环境变量')
  process.exit(1)
}

if (!isProd && !process.env.JWT_SECRET) {
  console.warn('[auth] 使用开发默认 JWT_SECRET，生产请务必设置环境变量')
}

export interface AuthPayload {
  userId: string
  email: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload
  } catch {
    return null
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null

  if (!token) {
    res.status(401).json({ error: '未登录' })
    return
  }

  const payload = verifyToken(token)
  if (!payload) {
    res.status(401).json({ error: '登录已过期' })
    return
  }

  req.auth = payload
  next()
}

declare module 'express-serve-static-core' {
  interface Request {
    auth?: AuthPayload
  }
}
