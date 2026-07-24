import { reactive } from 'vue'

export const toasts = reactive([])

let id = 0
function push(message, type) {
  const t = { id: ++id, message, type }
  toasts.push(t)
  setTimeout(() => {
    const i = toasts.findIndex((x) => x.id === t.id)
    if (i > -1) toasts.splice(i, 1)
  }, 3000)
}

export const toast = {
  success: (m) => push(m, 'success'),
  error: (m) => push(m, 'error'),
  info: (m) => push(m, 'info')
}
