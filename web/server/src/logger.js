/* Minimal leveled logger. */
const levels = { debug: 10, info: 20, warn: 30, error: 40 }
const threshold = levels[process.env.LOG_LEVEL] || levels.info

function log(level, ...args) {
  if (levels[level] < threshold) return
  const ts = new Date().toISOString()
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log
  fn(`[${ts}] [${level.toUpperCase()}]`, ...args)
}

export default {
  debug: (...a) => log('debug', ...a),
  info: (...a) => log('info', ...a),
  warn: (...a) => log('warn', ...a),
  error: (...a) => log('error', ...a)
}
