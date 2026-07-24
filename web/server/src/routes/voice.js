import { Router } from 'express'
import fs from 'fs'
import { audition } from '../services/voice.js'
import { streamFile } from '../util/stream.js'
import log from '../logger.js'

const router = Router()

// Preview (audition) a voice: synthesize text and stream back the wav.
router.post('/audition', async (req, res) => {
  const { voiceId, text } = req.body || {}
  if (!voiceId || !text) {
    return res.status(400).json({ error: 'voiceId and text are required' })
  }
  try {
    const audioPath = await audition(voiceId, text)
    if (!fs.existsSync(audioPath)) return res.status(500).json({ error: 'audio not generated' })
    streamFile(req, res, audioPath, 'audio/wav')
  } catch (err) {
    log.error('audition failed:', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
