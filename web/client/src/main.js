import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import Home from './views/Home.vue'
import VideoEdit from './views/VideoEdit.vue'
import Settings from './views/Settings.vue'
import './styles.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/home', component: Home },
    { path: '/video/edit', component: VideoEdit },
    { path: '/settings', component: Settings }
  ]
})

createApp(App).use(router).mount('#app')
