import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import { insert, selectPage, count, selectByID, remove as deleteModel } from '../dao/f2f-model.js'
import { train as trainVoice } from './voice.js'
import { assetPath } from '../config.js'
import log from '../logger.js'
import { extractAudio, toH264 } from './ffmpeg.js'

/**
 * Create a new avatar (model) from an uploaded source video.
 * @param {string} modelName
 * @param {string} videoPath absolute path of the uploaded source video
 * @returns {number} new model id
 */
export async function addModel(modelName, videoPath) {
  if (!fs.existsSync(assetPath.model)) {
    fs.mkdirSync(assetPath.model, { recursive: true })
  }

  const extname = path.extname(videoPath)
  const modelFileName = dayjs().format('YYYYMMDDHHmmssSSS') + extname
  const modelPath = path.join(assetPath.model, modelFileName)

  // Re-encode to H.264 into the shared face2face/temp folder.
  await toH264(videoPath, modelPath)

  // Separate the audio track for voice training.
  if (!fs.existsSync(assetPath.ttsTrain)) {
    fs.mkdirSync(assetPath.ttsTrain, { recursive: true })
  }
  const audioPath = path.join(assetPath.ttsTrain, modelFileName.replace(extname, '.wav'))
  await extractAudio(modelPath, audioPath)

  // Train the voice model (reference path relative to voice/data root).
  const relativeAudioPath = path.relative(assetPath.ttsRoot, audioPath)
  const voiceId = await trainVoice(relativeAudioPath, 'zh')
  if (!voiceId) {
    throw new Error('voice training failed')
  }

  const relativeModelPath = path.relative(assetPath.model, modelPath)
  const id = insert({
    modelName,
    videoPath: relativeModelPath,
    audioPath: relativeAudioPath,
    voiceId
  })
  return id
}

export function page({ page: p, pageSize, name = '' }) {
  const total = count(name)
  return {
    total,
    list: selectPage({ page: p, pageSize, name }).map((model) => ({
      ...model,
      // Expose a browser-playable URL instead of a filesystem path.
      video_url: `/api/models/${model.id}/video`
    }))
  }
}

export function findModel(modelId) {
  const model = selectByID(modelId)
  if (!model) return null
  return {
    ...model,
    video_url: `/api/models/${model.id}/video`
  }
}

/** Absolute path of a model's source video on the shared volume. */
export function modelVideoPath(modelId) {
  const model = selectByID(modelId)
  if (!model || !model.video_path) return null
  return path.join(assetPath.model, model.video_path)
}

export function countModel(name = '') {
  return count(name)
}

export function removeModel(modelId) {
  const model = selectByID(modelId)
  if (!model) return
  log.debug('~ removeModel ~ modelId:', modelId)

  const videoPath = path.join(assetPath.model, model.video_path || '')
  if (model.video_path && fs.existsSync(videoPath)) fs.unlinkSync(videoPath)

  const audioPath = path.join(assetPath.ttsRoot, model.audio_path || '')
  if (model.audio_path && fs.existsSync(audioPath)) fs.unlinkSync(audioPath)

  deleteModel(modelId)
}
