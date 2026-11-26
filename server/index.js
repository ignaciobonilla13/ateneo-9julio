import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MongoClient } from 'mongodb'
import { Server } from 'socket.io'
import { keysMatch, signToken, verifyToken } from './auth.js'
import { buildCsv } from './csv.js'
import { attachLive } from './live.js'
import { createStore } from './store.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
dotenv.config({ path: path.join(root, '.env') })

const presenterKey = process.env.PRESENTER_KEY || ''
if (presenterKey.length < 4) {
  console.error('Definí PRESENTER_KEY en el entorno (mínimo 4 caracteres).')
  process.exit(1)
}

const port = Number(process.env.PORT) || 3001
const dist = path.join(root, 'client', 'dist')
const attempts = new Map()

function lanHosts() {
  const hosts = []
  for (const nets of Object.values(os.networkInterfaces())) {
    for (const net of nets || []) {
      const v4 = net.family === 'IPv4' || net.family === 4
      if (v4 && !net.internal) hosts.push(net.address)
    }
  }
  return hosts
}

function blocked(ip) {
  const now = Date.now()
  const recent = (attempts.get(ip) || []).filter((stamp) => now - stamp < 10 * 60 * 1000)
  attempts.set(ip, recent)
  return recent.length >= 8
}

function registerFailure(ip) {
  const recent = attempts.get(ip) || []
  recent.push(Date.now())
  attempts.set(ip, recent)
}

async function openDatabase() {
  if (process.env.MONGODB_URI) {
    const client = new MongoClient(process.env.MONGODB_URI)
    await client.connect()
    return { client, db: client.db(), memory: null }
  }
  const allowMemory = process.env.ALLOW_MEMORY_MONGO === '1' && process.env.NODE_ENV !== 'production'
  if (!allowMemory) {
    console.error('Falta MONGODB_URI. En producción hay que usar una base MongoDB real.')
    process.exit(1)
  }
  console.log('Preparando MongoDB en memoria para desarrollo…')
  const { MongoMemoryServer } = await import('mongodb-memory-server')
  const memory = await MongoMemoryServer.create({ instance: { dbName: 'paglu' } })
  const client = new MongoClient(memory.getUri())
  await client.connect()
  console.log('MongoDB en memoria listo. Los datos se pierden al cerrar el servidor.')
  return { client, db: client.db(), memory }
}

const { client, db, memory } = await openDatabase()
const store = await createStore(db)
const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(cors({ origin: true }))
app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

app.get('/api/config', (req, res) => {
  const configured = (process.env.PUBLIC_URL || '').trim().replace(/\/$/, '')
  res.json({ publicUrl: configured || null, hosts: lanHosts() })
})

app.post('/api/auth', (req, res) => {
  const ip = req.ip || 'local'
  if (blocked(ip)) {
    res.status(429).json({ error: 'Demasiados intentos. Esperá un momento.' })
    return
  }
  if (!keysMatch(req.body?.key, presenterKey)) {
    registerFailure(ip)
    res.status(401).json({ error: 'Clave incorrecta' })
    return
  }
  res.json({ token: signToken(presenterKey) })
})

app.get('/api/export.csv', (req, res) => {
  const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!verifyToken(token, presenterKey)) {
    res.status(401).json({ error: 'No autorizado' })
    return
  }
  const csv = buildCsv(store.exportBundle())
  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="ateneo-resultados.csv"')
  res.send(csv)
})

if (fs.existsSync(dist)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders(res, filePath) {
      if (filePath.endsWith(`${path.sep}index.html`)) res.setHeader('Cache-Control', 'no-cache')
    },
  }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next()
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next()
    res.setHeader('Cache-Control', 'no-cache')
    res.sendFile(path.join(dist, 'index.html'), (error) => {
      if (error) next(error)
    })
  })
}

const httpServer = http.createServer(app)
const io = new Server(httpServer, {
  cors: { origin: true },
  perMessageDeflate: false,
  maxHttpBufferSize: 1e6,
})

io.use(async (socket, next) => {
  try {
    const auth = socket.handshake.auth || {}
    if (auth.role === 'presenter') {
      if (!verifyToken(auth.token, presenterKey)) {
        next(new Error('unauthorized'))
        return
      }
      socket.data.role = 'presenter'
      next()
      return
    }
    const claimed = await store.claimParticipant(auth.participantId, auth.secret)
    if (claimed.rejected || !claimed.participant) {
      next(new Error('identity'))
      return
    }
    socket.data.role = 'audience'
    socket.data.participantId = claimed.participant.id
    next()
  } catch (error) {
    console.error(error)
    next(new Error('connect'))
  }
})

attachLive(io, store)

httpServer.listen(port, () => {
  console.log(`Ateneo listo en http://localhost:${port}`)
})

async function shutdown() {
  httpServer.close()
  await io.close()
  await client.close()
  if (memory) await memory.stop()
  process.exit(0)
}

process.on('SIGINT', () => { void shutdown() })
process.on('SIGTERM', () => { void shutdown() })
