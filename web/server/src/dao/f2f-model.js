import { connect } from '../db/index.js'

export function insert({ modelName, videoPath, audioPath, voiceId }) {
  const db = connect()
  const stmt = db.prepare(
    'INSERT INTO f2f_model (name, video_path, audio_path, voice_id, created_at) VALUES (?, ?, ?, ?, ?)'
  )
  const info = stmt.run(modelName, videoPath, audioPath, voiceId, Date.now())
  return info.lastInsertRowid
}

export function selectPage({ page, pageSize, name = '' }) {
  const db = connect()
  const offset = (page - 1) * pageSize
  return db
    .prepare(
      `SELECT * FROM f2f_model WHERE name like ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(`%${name}%`, pageSize, offset)
}

export function count(name = '') {
  const db = connect()
  return db.prepare(`SELECT COUNT(*) as total FROM f2f_model WHERE name like ?`).get(`%${name}%`)
    .total
}

export function selectByID(id) {
  const db = connect()
  return db.prepare('SELECT * FROM f2f_model WHERE id = ?').get(id)
}

export function remove(id) {
  const db = connect()
  db.prepare(`DELETE FROM f2f_model WHERE id = ?`).run(id)
}
