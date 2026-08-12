import assert from 'node:assert/strict'
import { mock, test } from 'node:test'

const insertVoice = mock.fn()
const preprocessAndTrain = mock.fn(async () => ({
  code: -1,
  msg: 'ASR service is unavailable'
}))

mock.module(new URL('../dao/voice.js', import.meta.url), {
  namedExports: {
    insert: insertVoice,
    selectAll: mock.fn(),
    selectByID: mock.fn()
  }
})
mock.module(new URL('../api/tts.js', import.meta.url), {
  namedExports: {
    makeAudio: mock.fn(),
    preprocessAndTran: preprocessAndTrain
  }
})
mock.module(new URL('../config/config.js', import.meta.url), {
  namedExports: {
    assetPath: {}
  }
})
mock.module(new URL('../logger.js', import.meta.url), {
  defaultExport: {
    debug: mock.fn(),
    error: mock.fn()
  }
})
mock.module('electron', {
  namedExports: {
    ipcMain: { handle: mock.fn() }
  }
})
mock.module('dayjs', {
  defaultExport: mock.fn()
})

const { train } = await import('./voice.js')

test('train propagates the backend error without inserting a voice record', async () => {
  await assert.rejects(train('origin_audio/test.wav', 'zh'), /ASR service is unavailable/)
  assert.equal(insertVoice.mock.callCount(), 0)
})
