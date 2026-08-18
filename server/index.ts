import express from 'express'
import cors from 'cors'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocketServer } from 'ws'
import { authRouter } from './routes/auth.js'
import { usersRouter } from './routes/users.js'
import { friendsRouter } from './routes/friends.js'
import { messagesRouter } from './routes/messages.js'
import { pushRouter } from './routes/push.js'
import { handlePresenceConnection } from './presence.js'
import './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3001)
const isProd = process.env.NODE_ENV === 'production'

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server, path: '/ws' })

const corsOrigin = process.env.CORS_ORIGIN
app.use(
  cors(
    corsOrigin
      ? {
          origin: corsOrigin.split(',').map((item) => item.trim()).filter(Boolean),
          credentials: true,
        }
      : isProd
        ? { origin: false }
        : undefined,
  ),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/friends', friendsRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/push', pushRouter)

const distPath = path.join(__dirname, '..', 'dist')
app.use(
  express.static(distPath, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.webmanifest') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Content-Type', 'application/manifest+json')
      }
    },
  }),
)
app.get(/^(?!\/api|\/ws).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'))
})

wss.on('connection', (ws, req) => {
  const url = new URL(req.url ?? '', `http://${req.headers.host}`)
  const token = url.searchParams.get('token')
  handlePresenceConnection(ws, token)
})

server.listen(PORT, process.env.HOST ?? '127.0.0.1', () => {
  console.log(`GeoContacts server running at http://${process.env.HOST ?? '127.0.0.1'}:${PORT}`)
})
