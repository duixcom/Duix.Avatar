import fs from 'fs'

/** Stream a file with HTTP range support (progressive playback / seeking). */
export function streamFile(req, res, filePath, contentType) {
  const stat = fs.statSync(filePath)
  const total = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-')
    const start = parseInt(parts[0], 10)
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1
    if (start >= total || end >= total) {
      res.status(416).set('Content-Range', `bytes */${total}`).end()
      return
    }
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': contentType
    })
    fs.createReadStream(filePath, { start, end }).pipe(res)
  } else {
    res.status(200).set({
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
      'Content-Type': contentType
    })
    fs.createReadStream(filePath).pipe(res)
  }
}
