<template>
  <div class="settings">
    <div class="card">
      <h2>Backend Server</h2>
      <p class="hint">
        Enter the IP address or hostname of the machine running the Duix.Avatar
        backend containers. This web app connects to the TTS and video-generation
        services over the network.
      </p>

      <label class="lbl">Server host / IP</label>
      <input class="input" v-model="host" placeholder="e.g. 192.168.1.100" @keyup.enter="save" />

      <div class="ports" v-if="cfg">
        <div class="port"><span>TTS endpoint</span><code>{{ cfg.endpoints.tts }}</code></div>
        <div class="port"><span>Video endpoint</span><code>{{ cfg.endpoints.face2face }}</code></div>
        <div class="port"><span>Shared data root</span><code>{{ cfg.dataRoot }}</code></div>
      </div>

      <div class="actions">
        <button class="btn" @click="save" :disabled="saving">
          <span v-if="saving" class="spin"></span>{{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="btn ghost" @click="test" :disabled="testing">
          {{ testing ? 'Testing…' : 'Test connection' }}
        </button>
        <span v-if="testResult" :class="['result', testOk ? 'good' : 'bad']">{{ testResult }}</span>
      </div>

      <div class="note">
        <strong>Note:</strong> the backend services exchange media by shared file
        path, so this web container must mount the same <code>duix_avatar_data</code>
        volume the backend containers use (see <code>docker-compose.web.yml</code>).
        Real-time streaming interaction is not provided by the open-source
        containers — video is synthesized asynchronously and streamed on playback.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getConfig, setServerHost, countModel } from '../api'
import { toast } from '../toast.js'

const host = ref('')
const cfg = ref(null)
const saving = ref(false)
const testing = ref(false)
const testResult = ref('')
const testOk = ref(false)

async function load() {
  cfg.value = await getConfig()
  host.value = cfg.value.serverHost || cfg.value.defaultHost
}
async function save() {
  if (!host.value) return toast.error('Please enter a server host')
  saving.value = true
  try {
    cfg.value = await setServerHost(host.value.trim())
    cfg.value = await getConfig()
    toast.success('Backend server updated')
  } catch (e) {
    toast.error(e.message)
  } finally {
    saving.value = false
  }
}
async function test() {
  testing.value = true
  testResult.value = ''
  try {
    await save()
    // A simple round-trip through the BFF that reaches the backend.
    await countModel()
    testOk.value = true
    testResult.value = 'Reachable ✓'
  } catch (e) {
    testOk.value = false
    testResult.value = 'Failed: ' + e.message
  } finally {
    testing.value = false
  }
}
onMounted(load)
</script>

<style scoped>
.settings { display: flex; justify-content: center; padding: 40px 20px; }
.card { width: 100%; max-width: 640px; background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 32px; }
h2 { margin: 0 0 8px; }
.hint { color: var(--text-dim); font-size: 14px; line-height: 1.5; margin: 0 0 20px; }
.lbl { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }
.ports { margin: 20px 0; display: flex; flex-direction: column; gap: 8px; }
.port { display: flex; justify-content: space-between; font-size: 13px; color: var(--text-dim); }
.port code { color: var(--text); background: #f4f4f6; padding: 2px 8px; border-radius: 4px; }
.actions { display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.result { font-size: 13px; }
.result.good { color: #2ba471; }
.result.bad { color: #d54941; }
.note { margin-top: 24px; font-size: 12px; color: var(--text-dim); line-height: 1.6; background: #f8f8fb; border-radius: 8px; padding: 14px; }
.note code { background: #ececf3; padding: 1px 5px; border-radius: 4px; }
</style>
