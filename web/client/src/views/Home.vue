<template>
  <div class="home">
    <!-- banners -->
    <div class="banners">
      <div class="banner primary" @click="$router.push('/video/edit')">
        <div class="b-text">
          <div class="h1">Create Video</div>
          <div class="sub">Drive your avatar with text or audio to synthesize a video</div>
        </div>
        <div class="b-cta">Start creating →</div>
      </div>
      <div class="banner secondary" @click="showCreate = true">
        <div class="h1">Create Avatar</div>
        <div class="sub">Clone appearance & voice from a short video</div>
        <div class="b-link">New avatar →</div>
      </div>
    </div>

    <!-- tabs + lists -->
    <div class="panel">
      <div class="tabs">
        <div :class="['tab', { active: tab === 'works' }]" @click="tab = 'works'">
          My Works <span>({{ videoCount }})</span>
        </div>
        <div :class="['tab', { active: tab === 'avatars' }]" @click="tab = 'avatars'">
          My Avatars <span>({{ modelCount }})</span>
        </div>
      </div>

      <!-- WORKS -->
      <div v-show="tab === 'works'" class="grid-wrap">
        <input class="input search" v-model="worksSearch" placeholder="Search works" @input="debouncedWorks" />
        <div v-if="works.length === 0" class="empty">
          No works yet. <a @click="$router.push('/video/edit')">Create your first video</a>.
        </div>
        <div v-else class="grid">
          <div v-for="v in works" :key="v.id" class="cardv">
            <div class="thumb">
              <video v-if="v.status === 'success'" :src="fileUrl(v.id)" @click="preview(v)" />
              <div v-else class="placeholder" :class="v.status">
                <template v-if="v.status === 'pending' || v.status === 'waiting'">
                  <div class="spin dark"></div>
                  <span>{{ v.status === 'waiting' ? 'Queued ' + (v.progress || '') : 'Rendering ' + (v.progress || 0) + '%' }}</span>
                </template>
                <template v-else-if="v.status === 'failed'">
                  <span class="fail">Failed</span>
                  <small>{{ short(v.message) }}</small>
                </template>
                <template v-else>
                  <span>Draft</span>
                </template>
              </div>
              <div v-if="v.status === 'success'" class="ov">
                <button class="btn sm" @click="preview(v)">Preview</button>
                <button class="btn sm ghost" @click="download(v)">Download</button>
              </div>
            </div>
            <div class="meta">
              <div class="name" :title="v.name">{{ v.name }}</div>
              <div class="date">{{ fmtDate(v.created_at) }}</div>
              <span class="del" @click="delWork(v.id)">🗑</span>
            </div>
          </div>
        </div>
      </div>

      <!-- AVATARS -->
      <div v-show="tab === 'avatars'" class="grid-wrap">
        <input class="input search" v-model="avatarSearch" placeholder="Search avatars" @input="debouncedAvatars" />
        <div class="grid">
          <div class="cardv create" @click="showCreate = true">
            <div class="plus">＋</div>
            <span>Create Avatar</span>
          </div>
          <div v-for="m in avatars" :key="m.id" class="cardv">
            <div class="thumb">
              <video :src="m.video_url" muted @mouseenter="playHover" @mouseleave="stopHover" />
              <div class="ov">
                <button class="btn sm" @click="useAvatar(m)">Make video</button>
                <button class="btn sm ghost" @click="delAvatar(m.id)">Delete</button>
              </div>
            </div>
            <div class="meta">
              <div class="name" :title="m.name">{{ m.name }}</div>
              <div class="date">{{ fmtDate(m.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <CreateAvatarDialog v-if="showCreate" @close="showCreate = false" @created="onCreated" />

    <div v-if="previewVideo" class="overlay" @click.self="previewVideo = null">
      <div class="viewer">
        <video :src="fileUrl(previewVideo.id)" controls autoplay />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import {
  videoPage, countVideo, removeVideo, videoFileUrl,
  modelPage, countModel, removeModel
} from '../api'
import CreateAvatarDialog from '../components/CreateAvatarDialog.vue'
import { toast } from '../toast.js'

const router = useRouter()
const tab = ref('works')
const works = ref([])
const avatars = ref([])
const videoCount = ref(0)
const modelCount = ref(0)
const worksSearch = ref('')
const avatarSearch = ref('')
const showCreate = ref(false)
const previewVideo = ref(null)
let timer = null

const fileUrl = (id) => videoFileUrl(id)

async function loadWorks() {
  try {
    const res = await videoPage({ page: 1, pageSize: 50, name: worksSearch.value })
    works.value = res.list || []
    videoCount.value = res.total || 0
  } catch (e) { /* backend may be unset */ }
}
async function loadAvatars() {
  try {
    const res = await modelPage({ page: 1, pageSize: 100, name: avatarSearch.value })
    avatars.value = res.list || []
    modelCount.value = res.total || 0
  } catch (e) { /* ignore */ }
}
async function loadCounts() {
  try { videoCount.value = (await countVideo()).total } catch {}
  try { modelCount.value = (await countModel()).total } catch {}
}

let dW, dA
const debouncedWorks = () => { clearTimeout(dW); dW = setTimeout(loadWorks, 400) }
const debouncedAvatars = () => { clearTimeout(dA); dA = setTimeout(loadAvatars, 400) }

function preview(v) { previewVideo.value = v }
function download(v) { window.open(videoFileUrl(v.id, true), '_blank') }
async function delWork(id) {
  if (!confirm('Delete this work?')) return
  await removeVideo(id); toast.success('Deleted'); loadWorks(); loadCounts()
}
async function delAvatar(id) {
  if (!confirm('Delete this avatar?')) return
  await removeModel(id); toast.success('Deleted'); loadAvatars(); loadCounts()
}
function useAvatar(m) { router.push({ path: '/video/edit', query: { modelId: m.id } }) }
function onCreated() {
  showCreate.value = false
  tab.value = 'avatars'
  loadAvatars(); loadCounts()
}

function playHover(e) { e.target.play?.().catch(() => {}) }
function stopHover(e) { e.target.pause?.(); e.target.currentTime = 0 }

function fmtDate(ts) { return ts ? new Date(ts).toLocaleString() : '' }
function short(s) { return (s || '').toString().slice(0, 60) }

onMounted(() => {
  loadWorks(); loadAvatars(); loadCounts()
  timer = setInterval(loadWorks, 3000) // poll synthesis progress
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.home { padding: 20px; max-width: 1240px; margin: 0 auto; }
.banners { display: flex; gap: 20px; margin-bottom: 20px; }
.banner { border-radius: 12px; padding: 28px 32px; cursor: pointer; color: #fff; position: relative; overflow: hidden; }
.banner:hover { transform: translateY(-2px); transition: transform .15s; }
.banner.primary { flex: 2; background: linear-gradient(120deg, #6a5cff, #434af9 60%, #8d33ff); }
.banner.secondary { flex: 1; background: linear-gradient(120deg, #2f80ed, #2455c9); }
.banner .h1 { font-size: 28px; font-weight: 700; letter-spacing: 1px; }
.banner .sub { font-size: 13px; opacity: .85; margin-top: 6px; max-width: 80%; }
.b-cta { margin-top: 20px; font-weight: 600; }
.b-link { margin-top: 16px; display: inline-block; background: #fff; color: var(--brand2); font-weight: 600; font-size: 13px; padding: 7px 16px; border-radius: 20px; }

.panel { background: #fff; border-radius: 12px; padding: 16px 20px; }
.tabs { display: flex; gap: 28px; border-bottom: 1px solid var(--border); }
.tab { padding: 8px 0 14px; cursor: pointer; color: var(--text-dim); font-weight: 500; position: relative; }
.tab span { font-size: 12px; }
.tab.active { color: #000; font-weight: 700; }
.tab.active::after { content: ''; position: absolute; bottom: -1px; left: 50%; transform: translateX(-50%); width: 32px; height: 3px; border-radius: 3px; background: linear-gradient(90deg, var(--brand2), var(--brand)); }

.grid-wrap { padding-top: 16px; }
.search { max-width: 280px; margin-bottom: 16px; }
.empty { color: var(--text-dim); padding: 40px; text-align: center; }
.empty a { color: var(--brand); cursor: pointer; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }

.cardv { border-radius: 10px; overflow: hidden; background: #17181a; }
.cardv.create { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 190px; border: 1px dashed #33343a; background: #fafafc; color: var(--text-dim); cursor: pointer; }
.cardv.create .plus { font-size: 34px; }
.thumb { position: relative; aspect-ratio: 3/4; background: #000; }
.thumb video { width: 100%; height: 100%; object-fit: cover; display: block; cursor: pointer; }
.placeholder { width: 100%; height: 100%; display: flex; flex-direction: column; gap: 8px; align-items: center; justify-content: center; color: #aaa; font-size: 13px; }
.placeholder small { font-size: 11px; opacity: .7; padding: 0 10px; text-align: center; }
.placeholder .fail { color: #ff6b6b; }
.spin.dark { border-color: rgba(255,255,255,.2); border-top-color: #fff; }
.ov { position: absolute; inset: 0; background: rgba(0,0,0,.5); display: flex; gap: 8px; align-items: center; justify-content: center; opacity: 0; transition: opacity .15s; }
.thumb:hover .ov { opacity: 1; }
.meta { padding: 10px 12px; position: relative; color: #fff; }
.cardv.create .meta { display: none; }
.meta .name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta .date { font-size: 11px; color: #888; margin-top: 3px; }
.del { position: absolute; top: 10px; right: 10px; cursor: pointer; opacity: .5; }
.del:hover { opacity: 1; }

.viewer { background: #000; border-radius: 10px; overflow: hidden; max-width: 80vw; max-height: 86vh; }
.viewer video { max-width: 80vw; max-height: 86vh; display: block; }
</style>
