import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { PORT, ensureDirs, setHostResolver } from './config.js'
import { initDB } from './db/index.js'
import { get as getContext } from './dao/context.js'
import { startPoller } from './services/video.js'
import configRoutes from './routes/config.js'
import modelsRoutes from './routes/models.js'
import videosRoutes from './routes/videos.js'
import voiceRoutes from './routes/voice.js'
import log from './logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// --- init ---
ensureDirs()
initDB()
// Runtime backend host override comes from the DB (Settings page).
setHostResolver(() => getContext('server_host'))

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/config', configRoutes)
app.use('/api/models', modelsRoutes)
app.use('/api/videos', videosRoutes)
app.use('/api/voice', voiceRoutes)

// --- serve built frontend (SPA) ---
const clientDist = path.resolve(__dirname, '../../client/dist')
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
} else {
  log.warn('client build not found at', clientDist, '— serving API only')
}

app.use((err, req, res, next) => {
  log.error('unhandled error:', err.message)
  res.status(500).json({ error: err.message })
})

app.listen(PORT, () => {
  log.info(`Duix.Avatar web BFF listening on :${PORT}`)
  startPoller(2000)
})
