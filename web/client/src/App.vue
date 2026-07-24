<template>
  <div class="app">
    <header class="topbar" v-if="showChrome">
      <div class="brand" @click="$router.push('/home')">
        <span class="logo">◆</span> Duix.Avatar <span class="tag">Web</span>
      </div>
      <nav class="nav">
        <router-link to="/home" class="nav-link">Home</router-link>
        <span class="server" :class="{ ok: connected }" @click="$router.push('/settings')" :title="endpoint">
          <span class="dot"></span> {{ serverHost || 'not set' }}
        </span>
        <router-link to="/settings" class="nav-link">Settings</router-link>
      </nav>
    </header>
    <main class="content">
      <router-view />
    </main>

    <div class="toast-wrap">
      <div v-for="t in toasts" :key="t.id" class="toast" :class="t.type">{{ t.message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { toasts } from './toast.js'
import { getConfig } from './api'

const route = useRoute()
const serverHost = ref('')
const endpoint = ref('')
const connected = ref(false)

const showChrome = computed(() => route.path !== '/video/edit')

async function loadConfig() {
  try {
    const cfg = await getConfig()
    serverHost.value = cfg.serverHost
    endpoint.value = `TTS ${cfg.endpoints.tts} · Video ${cfg.endpoints.face2face}`
    connected.value = !!cfg.serverHost
  } catch {
    connected.value = false
  }
}
onMounted(loadConfig)
</script>

<style scoped>
.app { height: 100%; display: flex; flex-direction: column; }
.topbar {
  height: 60px; flex: none; display: flex; align-items: center; justify-content: space-between;
  padding: 0 24px; background: #fff; border-bottom: 1px solid var(--border);
}
.brand { font-weight: 700; font-size: 18px; cursor: pointer; display: flex; align-items: center; gap: 8px; }
.logo { color: var(--brand); }
.tag {
  font-size: 11px; font-weight: 600; color: #fff; background: var(--brand);
  padding: 2px 6px; border-radius: 4px;
}
.nav { display: flex; align-items: center; gap: 18px; }
.nav-link { font-size: 14px; color: var(--text-dim); }
.nav-link.router-link-active { color: var(--brand); font-weight: 600; }
.server {
  display: inline-flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;
  color: var(--text-dim); background: #f4f4f6; padding: 5px 10px; border-radius: 20px;
}
.server .dot { width: 8px; height: 8px; border-radius: 50%; background: #d54941; }
.server.ok .dot { background: #2ba471; }
.content { flex: 1; overflow: auto; }
</style>
