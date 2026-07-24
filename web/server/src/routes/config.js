import { Router } from 'express'
import { get as getContext, save as saveContext } from '../dao/context.js'
import { serviceUrl, defaults, getServerHost } from '../config.js'

const router = Router()

// Current effective backend configuration.
router.get('/', (req, res) => {
  res.json({
    serverHost: getServerHost(),
    defaultHost: defaults.host,
    ttsPort: defaults.ttsPort,
    face2facePort: defaults.face2facePort,
    dataRoot: defaults.dataRoot,
    endpoints: serviceUrl()
  })
})

// Update the backend server host at runtime (persisted in the DB).
router.post('/', (req, res) => {
  const { serverHost } = req.body || {}
  if (!serverHost || typeof serverHost !== 'string') {
    return res.status(400).json({ error: 'serverHost is required' })
  }
  // Basic validation: hostname or IP (optionally with port handled elsewhere).
  const trimmed = serverHost.trim()
  if (!/^[a-zA-Z0-9.\-_]+$/.test(trimmed)) {
    return res.status(400).json({ error: 'invalid serverHost' })
  }
  saveContext('server_host', trimmed)
  res.json({ serverHost: trimmed, endpoints: serviceUrl() })
})

export default router
