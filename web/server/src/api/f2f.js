import request from './request.js'
import { serviceUrl } from '../config.js'
import log from '../logger.js'

// Submit a video synthesis job to the gen-video (face2face) container.
export function makeVideo(param) {
  log.debug('~ makeVideo ~ param:', JSON.stringify(param))
  return request.post(`${serviceUrl().face2face}/submit`, param)
}

// Poll synthesis status by task code.
export function getVideoStatus(taskCode) {
  return request.get(`${serviceUrl().face2face}/query?code=${taskCode}`).then((res) => {
    log.debug('~ getVideoStatus ~ res:', JSON.stringify(res))
    return res
  })
}
