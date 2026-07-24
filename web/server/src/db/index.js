import path from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import sql from './sql.js'
import { APP_DATA } from '../config.js'
import log from '../logger.js'

const dbPath = path.join(APP_DATA, 'biz.db')

let dbInstance = null

export function connect() {
  if (!dbInstance) {
    dbInstance = new Database(dbPath, { fileMustExist: false })
    log.info('[DB] Connected:', dbPath)
  }
  return dbInstance
}

function findVersion() {
  const db = connect()
  const row = db.prepare(`SELECT val FROM context WHERE key = 'db_version'`).get()
  return row ? parseInt(row.val, 10) : 0
}

export function initDB() {
  if (!fs.existsSync(APP_DATA)) fs.mkdirSync(APP_DATA, { recursive: true })
  if (!fs.existsSync(dbPath)) {
    log.info('[DB] create db:', dbPath)
    const db = new Database(dbPath)
    db.exec(sql[0].script)
    db.close()
    dbInstance = null
  }
  const db = connect()
  const current = findVersion()
  sql
    .filter((item) => item.version > current)
    .forEach((item) => {
      log.info('[DB] apply migration v' + item.version)
      db.exec(item.script)
      db.prepare(`UPDATE context SET val = ? WHERE key = 'db_version'`).run(String(item.version))
    })
}
