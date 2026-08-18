/** 本地通讯录 / 族谱变更通知：同页 CustomEvent + 跨标签 BroadcastChannel */

export const CONTACTS_UPDATED_EVENT = 'geo-contacts-updated'
export const KINSHIPS_UPDATED_EVENT = 'geo-kinships-updated'

const CHANNEL_NAME = 'geo-contacts-sync'

type SyncMessage =
  | { type: typeof CONTACTS_UPDATED_EVENT }
  | { type: typeof KINSHIPS_UPDATED_EVENT }

let channel: BroadcastChannel | null = null

function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.addEventListener('message', (event: MessageEvent<SyncMessage>) => {
      const type = event.data?.type
      if (type === CONTACTS_UPDATED_EVENT || type === KINSHIPS_UPDATED_EVENT) {
        window.dispatchEvent(new Event(type))
      }
    })
  }
  return channel
}

getChannel()

/** 同页 + 跨标签都通知（seed / 系统标签同步等） */
export function notifyContactsUpdated(): void {
  window.dispatchEvent(new Event(CONTACTS_UPDATED_EVENT))
  getChannel()?.postMessage({ type: CONTACTS_UPDATED_EVENT } satisfies SyncMessage)
}

export function notifyKinshipsUpdated(): void {
  window.dispatchEvent(new Event(KINSHIPS_UPDATED_EVENT))
  getChannel()?.postMessage({ type: KINSHIPS_UPDATED_EVENT } satisfies SyncMessage)
}

/** 仅跨标签（本页已乐观更新，避免二次 refresh） */
export function broadcastContactsUpdated(): void {
  getChannel()?.postMessage({ type: CONTACTS_UPDATED_EVENT } satisfies SyncMessage)
}

export function broadcastKinshipsUpdated(): void {
  getChannel()?.postMessage({ type: KINSHIPS_UPDATED_EVENT } satisfies SyncMessage)
}
