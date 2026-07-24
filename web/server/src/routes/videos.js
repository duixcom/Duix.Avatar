import { Router } from 'express'
import fs from 'fs'
import {
  page,
  findVideo,
  countVideo,
  saveVideo,
  makeVideo,
  removeVideo,
  videoFilePath
} from '../services/video.js'
import { streamFile } from '../util/stream.js'

const router = Router()

// List works (paged). Polled by the UI to track synthesis progress.
router.get('/', (req, res) => {
  const { page: p = 1, pageSize = 10, name = '' } = req.query
  res.json(page({ page: +p, pageSize: +pageSize, name }))
})

router.get('/count', (req, res) => {
  res.json({ total: countVideo(req.query.name || '') })
})

// Stream / download a finished video (range-enabled).
router.get('/:id/file', (req, res) => {
  const filePath = videoFilePath(+req.params.id)
  if (!filePath || !fs.existsSync(filePath)) return res.status(404).end()
  if (req.query.download) {
    res.setHeader('Content-Disposition', `attachment; filename="video-${req.params.id}.mp4"`)
  }
  streamFile(req, res, filePath, 'video/mp4')
})

router.get('/:id', (req, res) => {
  const video = findVideo(+req.params.id)
  if (!video) return res.status(404).json({ error: 'not found' })
  res.json(video)
})

// Save a draft (create or update).
router.post('/', (req, res) => {
  const id = saveVideo(req.body || {})
  res.json({ id })
})

// Queue a saved video for synthesis.
router.post('/:id/make', (req, res) => {
  const id = makeVideo(+req.params.id)
  res.json({ id })
})

router.delete('/:id', (req, res) => {
  removeVideo(+req.params.id)
  res.json({ ok: true })
})

export default router
