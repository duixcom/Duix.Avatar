import { Router } from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { assetPath } from '../config.js'
import { probe } from '../services/ffmpeg.js'
import {
  addModel,
  page,
  findModel,
  countModel,
  removeModel,
  modelVideoPath
} from '../services/model.js'
import { streamFile } from '../util/stream.js'
import log from '../logger.js'

const router = Router()

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (!fs.existsSync(assetPath.uploads)) fs.mkdirSync(assetPath.uploads, { recursive: true })
      cb(null, assetPath.uploads)
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
  }),
  limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB
})

// List avatars (paged).
router.get('/', (req, res) => {
  const { page: p = 1, pageSize = 100, name = '' } = req.query
  res.json(page({ page: +p, pageSize: +pageSize, name }))
})

router.get('/count', (req, res) => {
  res.json({ total: countModel(req.query.name || '') })
})

// Stream a model's source video (used by the editor preview).
router.get('/:id/video', (req, res) => {
  const filePath = modelVideoPath(+req.params.id)
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).end()
  streamFile(req, res, filePath, 'video/mp4')
})

router.get('/:id', (req, res) => {
  const model = findModel(+req.params.id)
  if (!model) return res.status(404).json({ error: 'not found' })
  res.json(model)
})

// Create an avatar from an uploaded source video.
router.post('/', upload.single('video'), async (req, res) => {
  const name = req.body?.name
  const file = req.file
  if (!name) return res.status(400).json({ error: 'name is required' })
  if (!file) return res.status(400).json({ error: 'video file is required' })

  try {
    const info = await probe(file.path, 'video')
    if (!info.isOK) {
      return res.status(400).json({ error: info.msg || 'invalid video' })
    }
    if (info.duration && +info.duration < 8) {
      return res.status(400).json({ error: 'video must be at least 8 seconds' })
    }

    const id = await addModel(name, file.path)
    res.json({ id })
  } catch (err) {
    log.error('create model failed:', err.message)
    res.status(500).json({ error: err.message })
  } finally {
    // Clean up the raw upload; the H.264 copy lives on the shared volume.
    fs.promises.unlink(file.path).catch(() => {})
  }
})

router.delete('/:id', (req, res) => {
  removeModel(+req.params.id)
  res.json({ ok: true })
})

export default router
