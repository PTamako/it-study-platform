import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

createApp(App).mount('#app')

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        // Check for a published worker when the app is opened or returns to the foreground.
        if (document.visibilityState === 'visible') void registration.update().catch(() => {})
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void registration.update().catch(() => {})
        })
      })
      .catch((error: unknown) => {
        console.warn('Service worker registration failed:', error)
      })
  }, { once: true })
}
