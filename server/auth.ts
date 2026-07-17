import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET ?? 'geo-contacts-dev-secret-change-me'

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
