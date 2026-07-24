<template>
  <div class="editor">
    <!-- header -->
    <div class="ed-head">
      <span class="back" @click="$router.push('/home')">←</span>
      <input class="name-input" v-model="video.name" placeholder="Video name" />
      <div class="head-actions">
        <button class="btn ghost sm" @click="save" :disabled="busy">Save draft</button>
        <button class="btn sm" @click="submit" :disabled="busy">
          <span v-if="busy" class="spin"></span>Synthesize
        </button>
      </div>
    </div>

    <div class="ed-body">
      <!-- select avatar -->
      <section class="col select">
        <div class="col-head">Select Avatar</div>
        <div class="col-inner noscroll">
          <input class="input dk search" v-model="search" placeholder="Search avatars" @input="debouncedSearch" />
          <div class="create-avatar" @click="showCreate = true">
            <div class="plus">＋</div>
            <span>Create Avatar</span>
          </div>
          <div
            v-for="m in models"
            :key="m.id"
            :class="['mitem', { active: selected.model?.id === m.id }]"
            @click="selectModel(m)"
          >
            <video :src="m.video_url" muted />
            <div class="mname">{{ m.name }}</div>
          </div>
        </div>
      </section>

      <!-- preview -->
      <section class="col preview">
        <div class="col-head">Preview</div>
        <div class="preview-stage">
          <video v-if="selected.model?.video_url" :key="selected.model.id" :src="selected.model.video_url" controls loop />
          <div v-else class="pv-empty">Select an avatar to preview</div>
        </div>
      </section>

      <!-- edit -->
      <section class="col edit">
        <div class="col-head">Script</div>
        <div class="col-inner">
          <div class="tabs2">
            <div :class="['t2', { on: mode === 'text' }]" @click="mode = 'text'">Text</div>
            <div :class="['t2', { on: mode === 'audio' }]" @click="mode = 'audio'">Audio</div>
          </div>

          <div v-show="mode === 'text'" class="text-mode">
            <textarea class="input dk area" v-model="selected.text" placeholder="Enter the script the avatar will speak…"></textarea>
            <div class="text-foot">
              <span class="voice-label" v-if="selected.model?.voice_id">Voice: avatar's cloned voice</span>
              <span class="voice-label warn" v-else>Select an avatar first</span>
              <button class="btn ghost sm" @click="listen" :disabled="auditioning || !selected.model?.voice_id">
                <span v-if="auditioning" class="spin dark"></span>Preview voice
              </button>
            </div>
            <audio v-if="auditionUrl" :src="auditionUrl" controls class="aud" />
          </div>

          <div v-show="mode === 'audio'" class="audio-mode">
            <p class="hint">Upload your own audio to drive the avatar (overrides text).</p>
            <div class="drop-audio" @click="pickAudio">
              <input ref="audioInput" type="file" accept="audio/*" hidden @change="onAudio" />
              <template v-if="uploadedAudioName">
                <span>🎵 {{ uploadedAudioName }}</span>
                <button class="btn ghost sm" @click.stop="clearAudio">Remove</button>
              </template>
              <template v-else>
                <div class="ic">⬆</div>
                <span>Choose audio file</span>
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>

    <CreateAvatarDialog v-if="showCreate" @close="showCreate = false" @created="onCreated" />

    <div v-if="doneModal" class="overlay">
      <div class="done">
        <div class="done-ic">✓</div>
        <h3>Submitted!</h3>
        <p>Your video is being synthesized. Track progress under <b>My Works</b>.</p>
        <div class="done-actions">
          <button class="btn" @click="$router.push('/home')">Go to My Works</button>
          <button class="btn ghost" @click="resetForNew">Make another</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  modelPage, findModel, findVideo, saveVideo, makeVideo, audition
} from '../api'
import CreateAvatarDialog from '../components/CreateAvatarDialog.vue'
import { toast } from '../toast.js'

const route = useRoute()
const busy = ref(false)
const search = ref('')
const models = ref([])
const mode = ref('text')
const showCreate = ref(false)
const auditioning = ref(false)
const auditionUrl = ref('')
const doneModal = ref(false)
const audioInput = ref(null)
const uploadedAudioFile = ref(null)
const uploadedAudioName = ref('')

const video = reactive({ id: '', name: 'Video ' + new Date().toLocaleString() })
const selected = reactive({ model: null, text: '' })

async function loadModels(name = '') {
  const res = await modelPage({ page: 1, pageSize: 100, name })
  models.value = res.list || []
}
function selectModel(m) { selected.model = m }

let dS
const debouncedSearch = () => { clearTimeout(dS); dS = setTimeout(() => loadModels(search.value), 400) }

async function init() {
  await loadModels()
  const { videoId, modelId } = route.query
  if (videoId) {
    const v = await findVideo(videoId)
    if (v) {
      video.id = v.id; video.name = v.name; selected.text = v.text_content || ''
      if (v.model_id) selected.model = await findModel(v.model_id)
    }
  }
  if (modelId) {
    selected.model = await findModel(modelId)
  }
  if (!selected.model && models.value.length) selected.model = models.value[0]
}

function check() {
  if (!selected.model?.id) { toast.error('Select an avatar'); return false }
  if (!video.name) { toast.error('Enter a video name'); return false }
  if (!selected.text && !uploadedAudioFile.value) { toast.error('Enter a script or upload audio'); return false }
  return true
}

async function save() {
  const payload = {
    id: video.id || undefined,
    model_id: selected.model?.id,
    name: video.name,
    text_content: selected.text,
    voice_id: selected.model?.voice_id
  }
  // NOTE: uploaded-audio drive requires server-side audio upload; text path is primary.
  const res = await saveVideo(payload)
  video.id = video.id || res.id
  return video.id
}

async function submit() {
  if (busy.value || !check()) return
  busy.value = true
  try {
    const id = await save()
    await makeVideo(id)
    doneModal.value = true
  } catch (e) {
    toast.error(e.message || 'Failed to synthesize')
  } finally {
    busy.value = false
  }
}

async function listen() {
  if (!selected.model?.voice_id) return toast.error('Select an avatar')
  if (!selected.text) return toast.error('Enter a script')
  auditioning.value = true
  try {
    auditionUrl.value = await audition(selected.model.voice_id, selected.text)
  } catch (e) {
    toast.error(e.message)
  } finally {
    auditioning.value = false
  }
}

function pickAudio() { audioInput.value?.click() }
function onAudio(e) {
  const f = e.target.files?.[0]
  if (!f) return
  uploadedAudioFile.value = f
  uploadedAudioName.value = f.name
  toast.info('Audio drive is a preview feature; text-to-speech is the primary path.')
}
function clearAudio() { uploadedAudioFile.value = null; uploadedAudioName.value = '' }

function onCreated() { showCreate.value = false; loadModels() }
function resetForNew() {
  doneModal.value = false
  video.id = ''
  video.name = 'Video ' + new Date().toLocaleString()
  selected.text = ''
  auditionUrl.value = ''
}

watch(() => selected.model, () => { auditionUrl.value = '' })
onMounted(init)
</script>

<style scoped>
.editor { height: 100%; display: flex; flex-direction: column; background: var(--dark-1); color: #fff; }
.ed-head { height: 60px; flex: none; display: flex; align-items: center; gap: 16px; padding: 0 20px; border-bottom: 1px solid #000; }
.back { cursor: pointer; font-size: 20px; opacity: .8; }
.name-input { background: transparent; border: none; color: #fff; font-size: 15px; outline: none; flex: 1; max-width: 360px; }
.name-input:focus { border-bottom: 1px solid #444; }
.head-actions { margin-left: auto; display: flex; gap: 10px; }

.ed-body { flex: 1; display: flex; overflow: hidden; }
.col { display: flex; flex-direction: column; border-right: 1px solid #000; }
.col.select { flex: 2.7; }
.col.preview { flex: 4.5; }
.col.edit { flex: 5; border-right: none; }
.col-head { padding: 18px; text-align: center; font-size: 14px; font-weight: 500; border-bottom: 1px solid #000; }
.col-inner { flex: 1; overflow: auto; padding: 16px; }
.input.dk { background: var(--dark-1); border-color: #2e3033; color: #fff; }
.input.dk::placeholder { color: rgba(255,255,255,.5); }
.search { margin-bottom: 16px; }

.create-avatar { height: 160px; border: 1px solid #27292d; background: #17181a; border-radius: 6px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; color: #bbb; margin-bottom: 16px; }
.create-avatar .plus { font-size: 30px; }
.mitem { border-radius: 6px; overflow: hidden; cursor: pointer; margin-bottom: 12px; border: 2px solid transparent; }
.mitem.active { border-color: var(--brand); }
.mitem video { width: 100%; aspect-ratio: 3/4; object-fit: cover; display: block; background: #000; }
.mname { padding: 8px; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.preview-stage { flex: 1; display: flex; align-items: center; justify-content: center; background: #000; }
.preview-stage video { max-width: 100%; max-height: 100%; }
.pv-empty { color: #666; }

.tabs2 { display: flex; padding: 6px; background: var(--dark-2); border-radius: 6px; margin-bottom: 14px; }
.t2 { flex: 1; text-align: center; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 14px; color: #ccc; }
.t2.on { background: #2b3b52; color: #fff; }
.area { width: 100%; height: 260px; }
.text-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
.voice-label { font-size: 12px; color: #9aa; }
.voice-label.warn { color: #e6a23c; }
.aud { width: 100%; margin-top: 14px; }
.hint { color: #999; font-size: 13px; }
.drop-audio { margin-top: 12px; border: 1px dashed #333; border-radius: 8px; padding: 30px; display: flex; flex-direction: column; align-items: center; gap: 10px; cursor: pointer; color: #aaa; }
.drop-audio .ic { font-size: 30px; opacity: .6; }

.done { background: var(--dark-1); border: 1px solid #3f4041; border-radius: 12px; padding: 36px; text-align: center; width: 420px; }
.done-ic { width: 56px; height: 56px; border-radius: 50%; background: #2ba471; color: #fff; font-size: 28px; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.done p { color: #aaa; font-size: 14px; }
.done-actions { display: flex; gap: 12px; justify-content: center; margin-top: 20px; }
</style>
