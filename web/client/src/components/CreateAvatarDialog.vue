<template>
  <div class="overlay" @click.self="close">
    <div class="dialog">
      <div class="dlg-head">
        <span>Create Avatar</span>
        <span class="x" @click="close">✕</span>
      </div>
      <div class="dlg-body">
        <div class="row">
          <label class="lbl">Avatar name</label>
          <input class="input" v-model="name" placeholder="Enter a name" />
        </div>

        <label class="lbl">Source video</label>
        <div class="upload" :class="{ has: previewUrl }">
          <template v-if="previewUrl">
            <video :src="previewUrl" controls class="preview" />
            <button class="btn ghost sm change" @click="pick">Change</button>
          </template>
          <template v-else>
            <div class="drop" @click="pick">
              <div class="ic">⬆</div>
              <p>Upload a clear, front-facing video (≥ 8s recommended)</p>
              <button class="btn">Choose video</button>
            </div>
          </template>
          <input ref="fileInput" type="file" accept="video/*" hidden @change="onFile" />
        </div>

        <div v-if="submitting" class="progress">
          <div class="bar"><div class="fill" :style="{ width: uploadPct + '%' }"></div></div>
          <span>{{ phase }}</span>
        </div>
      </div>
      <div class="dlg-foot">
        <button class="btn ghost" @click="close" :disabled="submitting">Cancel</button>
        <button class="btn" @click="submit" :disabled="submitting">
          <span v-if="submitting" class="spin"></span>{{ submitting ? 'Creating…' : 'Create' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { addModel } from '../api'
import { toast } from '../toast.js'

const emit = defineEmits(['close', 'created'])

const name = ref('')
const file = ref(null)
const previewUrl = ref('')
const fileInput = ref(null)
const submitting = ref(false)
const uploadPct = ref(0)
const phase = ref('')

function pick() {
  fileInput.value?.click()
}
function onFile(e) {
  const f = e.target.files?.[0]
  if (!f) return
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
  if (!name.value) name.value = f.name.replace(/\.[^.]+$/, '')
}
async function submit() {
  if (!name.value) return toast.error('Please enter a name')
  if (!file.value) return toast.error('Please choose a video')
  submitting.value = true
  uploadPct.value = 0
  phase.value = 'Uploading…'
  try {
    await addModel({
      name: name.value,
      file: file.value,
      onProgress: (p) => {
        uploadPct.value = p
        if (p >= 100) phase.value = 'Processing & training voice… (this can take a while)'
      }
    })
    toast.success('Avatar created')
    emit('created')
  } catch (e) {
    toast.error(e.message)
  } finally {
    submitting.value = false
  }
}
function close() {
  if (submitting.value) return
  emit('close')
}
</script>

<style scoped>
.dialog { width: 640px; max-width: 92vw; background: var(--dark-1); color: #fff; border-radius: 10px; overflow: hidden; border: 1px solid #3f4041; }
.dlg-head { display: flex; justify-content: space-between; align-items: center; padding: 16px; font-weight: 500; border-bottom: 1px solid #000; }
.x { cursor: pointer; opacity: .7; }
.x:hover { opacity: 1; }
.dlg-body { padding: 24px; }
.row { margin-bottom: 18px; }
.lbl { display: block; font-size: 13px; margin-bottom: 8px; color: rgba(255,255,255,.85); }
.input { background: var(--dark-2); border-color: #333; color: #fff; }
.upload { background: var(--dark-2); border-radius: 8px; overflow: hidden; position: relative; min-height: 220px; display: flex; align-items: center; justify-content: center; }
.drop { text-align: center; padding: 30px; cursor: pointer; }
.drop .ic { font-size: 40px; opacity: .5; }
.drop p { color: rgba(255,255,255,.6); font-size: 13px; margin: 10px 0 16px; }
.preview { max-width: 100%; max-height: 320px; }
.change { position: absolute; top: 10px; right: 10px; }
.progress { margin-top: 18px; }
.bar { height: 6px; background: #333; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, var(--brand2), var(--brand)); transition: width .2s; }
.progress span { display: block; font-size: 12px; color: rgba(255,255,255,.6); margin-top: 8px; }
.dlg-foot { display: flex; justify-content: flex-end; gap: 12px; padding: 20px 24px; border-top: 1px solid #000; }
</style>
