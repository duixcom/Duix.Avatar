import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import dayjs from 'dayjs'
import { selectAll, insert, selectByID } from '../dao/voice.js'
import { preprocessAndTran, makeAudio as makeAudioApi } from '../api/tts.js'
import { assetPath } from '../config.js'
import log from '../logger.js'

export function getAllTimbre() {
  return selectAll()
}

/**
 * Train a voice model from a reference audio path (relative to voice/data).
 * Returns the new voice row id, or false on failure.
 */
export async function train(relPath, lang = 'zh') {
  relPath = relPath.replace(/\\/g, '/')
  const res = await preprocessAndTran({
    format: relPath.split('.').pop(),
    reference_audio: relPath,
    lang
  })
  log.debug('~ train ~ res:', res)
  if (res.code !== 0) {
    return false
  }
  const { asr_format_audio_url, reference_audio_text } = res
  return insert({
    origin_audio_path: relPath,
    lang,
    asr_format_audio_url,
    reference_audio_text
  })
}

export function makeAudio4Video({ voiceId, text }) {
  return makeAudio({ voiceId, text, targetDir: assetPath.ttsProduct })
}

export function copyAudio4Video(filePath) {
  const targetDir = assetPath.ttsProduct
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
  const fileName = dayjs().format('YYYYMMDDHHmmssSSS') + path.extname(filePath)
  fs.copyFileSync(filePath, path.join(targetDir, fileName))
  return fileName
}

/**
 * Synthesize audio from text using a trained voice. Writes <uuid>.wav into
 * targetDir and returns the bare filename (which is what the gen-video
 * container expects as audio_url).
 */
export async function makeAudio({ voiceId, text, targetDir }) {
  const uuid = crypto.randomUUID()
  const voice = selectByID(voiceId)
  if (!voice) throw new Error('voice not found: ' + voiceId)

  const res = await makeAudioApi({
    speaker: uuid,
    text,
    format: 'wav',
    topP: 0.7,
    max_new_tokens: 1024,
    chunk_length: 100,
    repetition_penalty: 1.2,
    temperature: 0.7,
    need_asr: false,
    streaming: false,
    is_fixed_seed: 0,
    is_norm: 1,
    reference_audio: voice.asr_format_audio_url,
    reference_text: voice.reference_audio_text
  })

  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
  fs.writeFileSync(path.join(targetDir, `${uuid}.wav`), Buffer.from(res), 'binary')
  return `${uuid}.wav`
}

/** Preview a voice: returns the absolute path of a temp wav. */
export async function audition(voiceId, text) {
  const fileName = await makeAudio({ voiceId, text, targetDir: assetPath.tmp })
  return path.join(assetPath.tmp, fileName)
}
