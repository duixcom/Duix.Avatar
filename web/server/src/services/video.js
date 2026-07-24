import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { assetPath } from '../config.js'
import {
  selectPage,
  selectByStatus,
  updateStatus,
  remove as deleteVideo,
  findFirstByStatus,
  insert as insertVideo,
  count,
  update,
  selectByID as selectVideoByID
} from '../dao/video.js'
import { selectByID as selectF2FModelByID } from '../dao/f2f-model.js'
import { selectByID as selectVoiceByID } from '../dao/voice.js'
import { makeAudio4Video, copyAudio4Video } from './voice.js'
import { makeVideo as makeVideoApi, getVideoStatus } from '../api/f2f.js'
import { getVideoDuration } from './ffmpeg.js'
import log from '../logger.js'

export function page({ page: p, pageSize, name = '' }) {
  const waitingVideos = selectByStatus('waiting').map((v) => v.id)
  const total = count(name)
  const list = selectPage({ page: p, pageSize, name }).map((video) => {
    const item = {
      ...video,
      // Browser-playable URL for finished videos.
      file_url: video.status === 'success' ? `/api/videos/${video.id}/file` : null
    }
    if (video.status === 'waiting') {
      item.progress = `${waitingVideos.indexOf(video.id) + 1} / ${waitingVideos.length}`
    }
    return item
  })
  return { total, list }
}

export function findVideo(videoId) {
  const video = selectVideoByID(videoId)
  if (!video) return null
  return {
    ...video,
    file_url: video.status === 'success' ? `/api/videos/${video.id}/file` : null
  }
}

export function countVideo(name = '') {
  return count(name)
}

export function saveVideo({ id, model_id, name, text_content, voice_id, audio_path }) {
  const video = id ? selectVideoByID(id) : null
  if (audio_path) {
    audio_path = copyAudio4Video(audio_path)
  }
  if (video) {
    update({ id, model_id, name, text_content, voice_id, audio_path })
    return id
  }
  return insertVideo({ model_id, name, status: 'draft', text_content, voice_id, audio_path })
}

/** Mark a video as queued for synthesis. */
export function makeVideo(videoId) {
  update({ id: videoId, status: 'waiting' })
  return videoId
}

async function makeVideoByF2F(audioPath, videoPath) {
  const uuid = crypto.randomUUID()
  const param = {
    audio_url: audioPath,
    video_url: videoPath,
    code: uuid,
    chaofen: 0,
    watermark_switch: 0,
    pn: 1
  }
  const result = await makeVideoApi(param)
  return { param, result }
}

export async function synthesisVideo(videoId) {
  try {
    update({ id: videoId, file_path: null, status: 'pending', message: 'submitting task' })

    const video = selectVideoByID(videoId)
    const model = selectF2FModelByID(video.model_id)
    if (!model) throw new Error('model not found: ' + video.model_id)

    let audioPath
    if (video.audio_path) {
      audioPath = video.audio_path
    } else {
      const voice = selectVoiceByID(video.voice_id || model.voice_id)
      if (!voice) throw new Error('voice not found')
      audioPath = await makeAudio4Video({ voiceId: voice.id, text: video.text_content })
    }

    const { result, param } = await makeVideoByF2F(audioPath, model.video_path)
    log.debug('~ synthesisVideo ~ result:', result)

    if (result.code === 10000) {
      update({
        id: videoId,
        file_path: null,
        status: 'pending',
        message: JSON.stringify(result),
        audio_path: audioPath,
        param: JSON.stringify(param),
        code: param.code
      })
    } else {
      update({
        id: videoId,
        file_path: null,
        status: 'failed',
        message: result.msg,
        audio_path: audioPath,
        param: JSON.stringify(param),
        code: param.code
      })
    }
  } catch (error) {
    log.error('~ synthesisVideo ~ error:', error.message)
    updateStatus(videoId, 'failed', error.message)
  }
  return videoId
}

function synthesisNext() {
  const video = findFirstByStatus('waiting')
  if (video) synthesisVideo(video.id)
}

/**
 * Background loop: advances queued jobs and polls in-flight jobs for status.
 * Mirrors the Electron main-process loopPending().
 */
export async function loopPending() {
  try {
    const video = findFirstByStatus('pending')
    if (!video) {
      synthesisNext()
      return
    }

    const statusRes = await getVideoStatus(video.code)
    if ([9999, 10002, 10003].includes(statusRes.code)) {
      updateStatus(video.id, 'failed', statusRes.msg)
    } else if (statusRes.code === 10000) {
      const data = statusRes.data
      if (data.status === 1) {
        updateStatus(video.id, 'pending', data.msg, data.progress)
      } else if (data.status === 2) {
        let duration = 0
        try {
          const resultPath = resolveResultPath(data.result)
          if (resultPath) duration = await getVideoDuration(resultPath)
        } catch (e) {
          log.warn('duration probe failed:', e.message)
        }
        update({
          id: video.id,
          status: 'success',
          message: data.msg,
          progress: data.progress,
          file_path: data.result,
          duration
        })
      } else if (data.status === 3) {
        updateStatus(video.id, 'failed', data.msg)
      }
    }
  } catch (error) {
    log.error('~ loopPending ~ error:', error.message)
  }
}

export function startPoller(intervalMs = 2000) {
  const tick = async () => {
    await loopPending()
    setTimeout(tick, intervalMs)
  }
  tick()
}

/**
 * The gen-video container returns a result path relative to its /code/data
 * mount (the face2face root). Depending on the image version this can be a bare
 * filename or a nested path, so we probe a few candidate locations.
 */
export function resolveResultPath(result) {
  if (!result) return null
  const candidates = [
    path.join(assetPath.face2faceRoot, result),
    path.join(assetPath.model, result),
    path.join(assetPath.face2faceRoot, path.basename(result)),
    path.join(assetPath.model, path.basename(result))
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

export function videoFilePath(videoId) {
  const video = selectVideoByID(videoId)
  if (!video || !video.file_path) return null
  return resolveResultPath(video.file_path)
}

export function removeVideo(videoId) {
  const video = selectVideoByID(videoId)
  if (!video) return
  const filePath = video.file_path ? resolveResultPath(video.file_path) : null
  if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath)

  const audioPath = video.audio_path ? path.join(assetPath.model, video.audio_path) : null
  if (audioPath && fs.existsSync(audioPath)) fs.unlinkSync(audioPath)

  deleteVideo(videoId)
}
