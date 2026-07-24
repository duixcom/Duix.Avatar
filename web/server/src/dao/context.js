import { connect } from '../db/index.js'

export function findByKey(key) {
  const db = connect()
  return db.prepare(`SELECT * FROM context WHERE key = ?`).get(key)
}

export function get(key) {
  const row = findByKey(key)
  return row ? row.val : undefined
}

export function save(key, val) {
  const db = connect()
  const existing = findByKey(key)
  if (existing) {
    db.prepare(`UPDATE context SET val = ? WHERE key = ?`).run(String(val), key)
  } else {
    db.prepare(`INSERT INTO context (key, val) VALUES (?, ?)`).run(key, String(val))
  }
  return true
}
