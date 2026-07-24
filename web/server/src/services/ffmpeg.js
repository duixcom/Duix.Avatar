import ffmpeg from 'fluent-ffmpeg'
import log from '../logger.js'

// In the container we rely on the system ffmpeg/ffprobe (installed via apt).
// Allow explicit overrides for local development.
if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH)
if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH)

export function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .noVideo()
      .save(audioPath)
      .on('end', () => {
        log.info('audio split done')
        resolve(true)
      })
      .on('error', (err) => reject(err))
  })
}

export function toH264(videoPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .videoCodec('libx264')
      .outputOptions('-pix_fmt yuv420p')
      .save(outputPath)
      .on('end', () => {
        log.info('video convert to h264 done')
        resolve(true)
      })
      .on('error', (err) => reject(err))
  })
}

export function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath).ffprobe((err, data) => {
      if (err) {
        log.error('ffprobe err:', err)
        reject(err)
      } else if (data && data.streams && data.streams.length > 0) {
        resolve(data.streams[0].duration)
      } else {
        reject(new Error('No streams found'))
      }
    })
  })
}

export function probe(mediaPath, type = 'video') {
  return new Promise((resolve) => {
    ffmpeg(mediaPath).ffprobe((err, data) => {
      if (err) {
        resolve({ isOK: false, msg: err.toString() })
      } else if (data?.streams?.length > 0) {
        const stream = data.streams.find((s) => s.codec_type === type) || data.streams[0]
        resolve(Object.assign({ isOK: true }, data.format, stream))
      } else {
        resolve({ isOK: false, msg: 'No streams found' })
      }
    })
  })
}
