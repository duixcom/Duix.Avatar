import { connect } from '../db/index.js'

export function selectPage({ page, pageSize, name = '' }) {
  const db = connect()
  const offset = (page - 1) * pageSize
  return db
    .prepare(
      `SELECT * FROM video WHERE name like ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(`%${name}%`, pageSize, offset)
}

export function count(name = '') {
  const db = connect()
  return db.prepare(`SELECT COUNT(*) as total FROM video WHERE name like ?`).get(`%${name}%`).total
}

export function insert(video) {
  const db = connect()
  const columns = Object.keys(video)
  const stmt = db.prepare(
    `insert into video (${columns.join(',')}, created_at) values (${columns
      .map(() => '?')
      .join(',')}, ?)`
  )
  const info = stmt.run(
    ...Object.values(video).map((v) =>
      typeof v === 'object' && v !== null ? JSON.stringify(v) : v
    ),
    Date.now()
  )
  return info.lastInsertRowid
}

export function remove(id) {
  const db = connect()
  db.prepare(`DELETE FROM video WHERE id = ?`).run(id)
}

export function update(video) {
  const sets = Object.keys(video)
    .map((key) => `${key} = ?`)
    .join(',')
  const db = connect()
  return db
    .prepare(`UPDATE video SET ${sets} WHERE id = ?`)
    .run(
      ...Object.values(video).map((v) =>
        typeof v === 'object' && v !== null ? JSON.stringify(v) : v
      ),
      video.id
    )
}

export function selectByStatus(status) {
  const db = connect()
  return db.prepare(`SELECT * FROM video WHERE status = ?`).all(status)
}

export function findFirstByStatus(status) {
  const db = connect()
  return db.prepare(`SELECT * FROM video WHERE status = ? LIMIT 1`).get(status)
}

export function updateStatus(id, status, message, progress = 0, file_path = '') {
  const db = connect()
  db.prepare(
    `UPDATE video SET status = ?, message = ?, progress = ?, file_path = ? WHERE id = ?`
  ).run(status, message, progress, file_path, id)
}

export function selectByID(id) {
  const db = connect()
  return db.prepare(`SELECT * FROM video WHERE id = ?`).get(id)
}
