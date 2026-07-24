import request from './request.js'
import { serviceUrl } from '../config.js'
import log from '../logger.js'

// Text-to-speech synthesis. Returns a WAV arraybuffer.
export function makeAudio(param) {
  log.debug('~ makeAudio ~ param:', JSON.stringify(param))
  return request.post(`${serviceUrl().tts}/v1/invoke`, param, {
    responseType: 'arraybuffer'
  })
}

// Voice training / reference preprocessing.
export function preprocessAndTran(param) {
  log.debug('~ preprocessAndTran ~ param:', JSON.stringify(param))
  return request.post(`${serviceUrl().tts}/v1/preprocess_and_tran`, param)
}
