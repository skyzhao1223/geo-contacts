import { useEffect, useState } from 'react'
import { getToken, getWebSocketUrl } from '@/lib/api'
import type { PresenceState } from '@/types/user'
import type { ChatMessage } from '@/types/message'

export type RealtimeChatEvent =
  | { type: 'chat_message'; conversationId: string; message: ChatMessage }
  | { type: 'chat_read'; conversationId: string; userId: string; lastReadAt: number }

const CHAT_EVENT = 'geo-chat-event'

export function dispatchChatEvent(detail: RealtimeChatEvent) {
  window.dispatchEvent(new CustomEvent(CHAT_EVENT, { detail }))
}

export function subscribeChatEvents(handler: (event: RealtimeChatEvent) => void) {
  const listener = (event: Event) => {
    handler((event as CustomEvent<RealtimeChatEvent>).detail)
  }
  window.addEventListener(CHAT_EVENT, listener)
  return () => window.removeEventListener(CHAT_EVENT, listener)
}

/** WebSocket：在线状态 + 聊天推送；纯查询见 `@/lib/presence` */
export function usePresence(enabled: boolean) {
  const [presence, setPresence] = useState<PresenceState>({})

  useEffect(() => {
    if (!enabled) return

    const token = getToken()
    if (!token) return

    let socket: WebSocket | null = null
    let heartbeatTimer: number | null = null
    let reconnectTimer: number | null = null
    let closedByUser = false

    const connect = () => {
      socket = new WebSocket(getWebSocketUrl(token))

      socket.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as
          | { type: 'snapshot'; onlineUsers: Array<{ userId: string; online: boolean; lastSeenAt: number | null }> }
          | { type: 'presence'; userId: string; online: boolean; lastSeenAt: number | null }
          | { type: 'chat_message'; conversationId: string; message: ChatMessage }
          | { type: 'chat_read'; conversationId: string; userId: string; lastReadAt: number }
          | { type: 'heartbeat_ack' }

        if (message.type === 'snapshot') {
          setPresence(
            Object.fromEntries(
              message.onlineUsers.map((item) => [
                item.userId,
                { online: item.online, lastSeenAt: item.lastSeenAt },
              ]),
            ),
          )
        }

        if (message.type === 'presence') {
          setPresence((current) => ({
            ...current,
            [message.userId]: {
              online: message.online,
              lastSeenAt: message.lastSeenAt,
            },
          }))
        }

        if (message.type === 'chat_message' || message.type === 'chat_read') {
          dispatchChatEvent(message)
        }
      }

      socket.onopen = () => {
        heartbeatTimer = window.setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: 'heartbeat' }))
          }
        }, 25_000)
      }

      socket.onclose = () => {
        if (heartbeatTimer) {
          window.clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }
        if (!closedByUser) {
          reconnectTimer = window.setTimeout(connect, 3000)
        }
      }
    }

    connect()

    return () => {
      closedByUser = true
      if (heartbeatTimer) window.clearInterval(heartbeatTimer)
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [enabled])

  return presence
}
