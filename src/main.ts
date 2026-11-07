import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

// A build-specific marker catches releases when the service worker source is unchanged.
const currentVersion = import.meta.env.VITE_APP_VERSION || 'development'
async function checkPublishedVersion() {
  if (!import.meta.env.PROD) return
  try {
    const response = await fetch('/version.json?ts=' + Date.now(), { cache: 'no-store' })
    if (!response.ok) return
    const data = await response.json() as { version?: string }
    if (typeof data.version === 'string' && data.version !== currentVersion)
      window.dispatchEvent(new Event('zhixue:update-available'))
  } catch { /* Offline: retain the already loaded app. */ }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const hadController = Boolean(navigator.serviceWorker.controller)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (hadController) window.dispatchEvent(new Event('zhixue:update-available'))
    })
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        const check = () => {
          if (document.visibilityState !== 'visible') return
          void registration.update().catch(() => {})
          void checkPublishedVersion()
        }
        check()
        document.addEventListener('visibilitychange', check)
        window.addEventListener('online', check)
      })
      .catch((error: unknown) => {
        console.warn('Service worker registration failed:', error)
        void checkPublishedVersion()
      })
  }, { once: true })
}
