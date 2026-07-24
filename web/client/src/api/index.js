import axios from 'axios'

const http = axios.create({ baseURL: '/api', timeout: 0 })
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'request failed'
    return Promise.reject(new Error(msg))
  }
)

// --- config / backend host ---
export const getConfig = () => http.get('/config')
export const setServerHost = (serverHost) => http.post('/config', { serverHost })

// --- models (avatars) ---
export const modelPage = (params = {}) => http.get('/models', { params })
export const findModel = (id) => http.get(`/models/${id}`)
export const countModel = (name = '') => http.get('/models/count', { params: { name } })
export const removeModel = (id) => http.delete(`/models/${id}`)
export function addModel({ name, file, onProgress }) {
  const form = new FormData()
  form.append('name', name)
  form.append('video', file)
  return http.post('/models', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    }
  })
}

// --- videos (works) ---
export const videoPage = (params = {}) => http.get('/videos', { params })
export const findVideo = (id) => http.get(`/videos/${id}`)
export const countVideo = (name = '') => http.get('/videos/count', { params: { name } })
export const saveVideo = (video) => http.post('/videos', video)
export const makeVideo = (id) => http.post(`/videos/${id}/make`)
export const removeVideo = (id) => http.delete(`/videos/${id}`)
export const videoFileUrl = (id, download = false) =>
  `/api/videos/${id}/file${download ? '?download=1' : ''}`

// --- voice ---
export async function audition(voiceId, text) {
  const res = await fetch('/api/voice/audition', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voiceId, text })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'audition failed')
  }
  const blob = await res.blob()
  return URL.createObjectURL(blob)
}
