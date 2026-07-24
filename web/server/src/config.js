/**
 * Runtime configuration for the Duix.Avatar web BFF.
 *
 * The backend services (TTS + gen-video) run in Docker containers on a GPU
 * server. This BFF connects to them over the network. The server host can be
 * configured three ways (highest priority first):
 *
 *   1. Runtime override saved in the DB (context key `server_host`) via the
 *      Settings page in the web UI.
 *   2. Explicit base URLs: TTS_BASE_URL / FACE2FACE_BASE_URL env vars.
 *   3. DUIX_SERVER_HOST + TTS_PORT / FACE2FACE_PORT env vars.
 *
 * Because the Duix backend containers exchange media by *file path* (not HTTP
 * upload), this BFF must share the same data volume that the containers mount.
 * DATA_ROOT points at that shared directory (contains face2face/ and voice/).
 */
import path from 'path'
import fs from 'fs'

const env = process.env

export const PORT = parseInt(env.PORT || '3000', 10)

// Shared data volume — must be the SAME directory the backend containers mount.
//   gen-video:  <DATA_ROOT>/face2face   -> /code/data
//   tts:        <DATA_ROOT>/voice/data  -> /code/data
export const DATA_ROOT = env.DATA_ROOT || '/data/duix_avatar_data'

// Where the app keeps its own SQLite DB (does not need to be shared).
export const APP_DATA = env.APP_DATA || '/data/app'

export const DEFAULT_SERVER_HOST = env.DUIX_SERVER_HOST || '127.0.0.1'
const TTS_PORT = env.TTS_PORT || '18180'
const FACE2FACE_PORT = env.FACE2FACE_PORT || '8383'

// Optional explicit overrides.
const TTS_BASE_URL = env.TTS_BASE_URL || ''
const FACE2FACE_BASE_URL = env.FACE2FACE_BASE_URL || ''

// Filesystem layout — mirrors src/main/config/config.js assetPath.
export const assetPath = {
  model: path.join(DATA_ROOT, 'face2face', 'temp'), // model videos + tts products
  ttsProduct: path.join(DATA_ROOT, 'face2face', 'temp'),
  ttsRoot: path.join(DATA_ROOT, 'voice', 'data'),
  ttsTrain: path.join(DATA_ROOT, 'voice', 'data', 'origin_audio'),
  face2faceRoot: path.join(DATA_ROOT, 'face2face'),
  uploads: path.join(APP_DATA, 'uploads'),
  tmp: path.join(APP_DATA, 'tmp')
}

export function ensureDirs() {
  for (const dir of [
    assetPath.model,
    assetPath.ttsRoot,
    assetPath.ttsTrain,
    assetPath.uploads,
    assetPath.tmp,
    APP_DATA
  ]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}

/**
 * Effective backend host. A runtime override (from the Settings page, stored in
 * the DB) wins over the env default. `getServerHost` is injected lazily to
 * avoid a circular import with the DAO layer.
 */
let hostResolver = () => DEFAULT_SERVER_HOST
export function setHostResolver(fn) {
  hostResolver = fn
}
export function getServerHost() {
  try {
    return hostResolver() || DEFAULT_SERVER_HOST
  } catch {
    return DEFAULT_SERVER_HOST
  }
}

/** Base URLs computed from the effective host (or explicit env overrides). */
export function serviceUrl() {
  const host = getServerHost()
  return {
    tts: TTS_BASE_URL || `http://${host}:${TTS_PORT}`,
    face2face: FACE2FACE_BASE_URL || `http://${host}:${FACE2FACE_PORT}/easy`
  }
}

export const defaults = {
  host: DEFAULT_SERVER_HOST,
  ttsPort: TTS_PORT,
  face2facePort: FACE2FACE_PORT,
  dataRoot: DATA_ROOT
}
