import { connect } from '../db/index.js'

export function selectAll() {
  const db = connect()
  return db.prepare(`SELECT * FROM voice ORDER BY created_at DESC`).all()
}

export function insert({ origin_audio_path, lang, asr_format_audio_url, reference_audio_text }) {
  const db = connect()
  const info = db
    .prepare(
      `INSERT INTO voice (origin_audio_path, lang, asr_format_audio_url, reference_audio_text, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(origin_audio_path, lang, asr_format_audio_url, reference_audio_text, Date.now())
  return info.lastInsertRowid
}

export function selectByID(id) {
  const db = connect()
  return db.prepare(`SELECT * FROM voice WHERE id = ?`).get(id)
}
