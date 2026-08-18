import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { flushPendingPushSubscription, stashPendingPushSubscription, syncPushSubscription } from '@/lib/push'

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (registration) {
      void registration.update()
    }
  },
})

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data as
      | {
          type?: string
          subscription?: {
            endpoint?: string
            keys?: { p256dh?: string; auth?: string }
          }
        }
      | undefined
    if (data?.type !== 'pushsubscriptionchange') return
    if (data.subscription?.endpoint) {
      stashPendingPushSubscription({
        endpoint: data.subscription.endpoint,
        keys: data.subscription.keys,
      })
    }
    void flushPendingPushSubscription().then(() => syncPushSubscription())
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
