import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { subscribeChatEvents } from '@/hooks/usePresence'
import type { ChatMessage, ConversationSummary } from '@/types/message'

const PAGE_SIZE = 50
const MAX_CACHED_CONVERSATIONS = 8

export interface ChatContextValue {
  conversations: ConversationSummary[]
  loading: boolean
  refreshConversations: () => Promise<void>
  openConversationWith: (peerUserId: string) => Promise<ConversationSummary>
  getMessages: (conversationId: string) => ChatMessage[]
  hasMoreMessages: (conversationId: string) => boolean
  loadMessages: (conversationId: string) => Promise<ChatMessage[]>
  loadOlderMessages: (conversationId: string) => Promise<ChatMessage[]>
  sendMessage: (conversationId: string, body: string) => Promise<ChatMessage>
  markRead: (conversationId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)
const UnreadTotalContext = createContext(0)

function bumpConversation(
  list: ConversationSummary[],
  conversationId: string,
  patch: Partial<ConversationSummary>,
): ConversationSummary[] {
  const index = list.findIndex((item) => item.id === conversationId)
  if (index < 0) return list
  const next = { ...list[index], ...patch }
  const others = list.filter((item) => item.id !== conversationId)
  return [next, ...others]
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [messagesById, setMessagesById] = useState<Record<string, ChatMessage[]>>({})
  const [hasMoreById, setHasMoreById] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const activeConversationRef = useRef<string | null>(null)
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations

  const pruneMessageCache = useCallback((keepId?: string | null) => {
    setMessagesById((current) => {
      const keys = Object.keys(current)
      if (keys.length <= MAX_CACHED_CONVERSATIONS) return current
      const keep = new Set<string>()
      if (keepId) keep.add(keepId)
      for (const conv of conversationsRef.current) {
        if (keep.size >= MAX_CACHED_CONVERSATIONS) break
        if (current[conv.id]) keep.add(conv.id)
      }
      if (keep.size === 0) return current
      const next: Record<string, ChatMessage[]> = {}
      for (const key of keep) {
        if (current[key]) next[key] = current[key]
      }
      return next
    })
  }, [])

  const refreshConversations = useCallback(async () => {
    if (!user) {
      setConversations([])
      return
    }
    setLoading(true)
    try {
      const res = await api.listConversations()
      setConversations(res.conversations)
    } catch (error) {
      console.error('refreshConversations failed', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void refreshConversations()
  }, [refreshConversations])

  useEffect(() => {
    return subscribeChatEvents((event) => {
      if (event.type === 'chat_message') {
        const { conversationId, message } = event
        const isActive = activeConversationRef.current === conversationId
        const isMine = message.senderId === user?.id

        setMessagesById((current) => {
          const list = current[conversationId]
          if (!list) return current
          if (list.some((item) => item.id === message.id)) return current
          // 替换同内容的乐观消息
          const withoutOptimistic = list.filter(
            (item) =>
              !(
                item.id.startsWith('optimistic:') &&
                item.body === message.body &&
                item.senderId === message.senderId
              ),
          )
          return {
            ...current,
            [conversationId]: [...withoutOptimistic, message],
          }
        })

        setConversations((current) => {
          const existing = current.find((item) => item.id === conversationId)
          if (!existing) {
            void refreshConversations()
            return current
          }
          const unreadBump = !isMine && !isActive ? 1 : 0
          return bumpConversation(current, conversationId, {
            lastMessageAt: message.createdAt,
            lastMessageBody: message.body,
            unreadCount: existing.unreadCount + unreadBump,
          })
        })
      }

      if (event.type === 'chat_read') {
        setConversations((current) =>
          bumpConversation(current, event.conversationId, { unreadCount: 0 }),
        )
      }
    })
  }, [refreshConversations, user?.id])

  const openConversationWith = useCallback(async (peerUserId: string) => {
    const res = await api.openConversation(peerUserId)
    setConversations((current) => {
      const others = current.filter((item) => item.id !== res.conversation.id)
      return [res.conversation, ...others]
    })
    return res.conversation
  }, [])

  const getMessages = useCallback(
    (conversationId: string) => messagesById[conversationId] ?? [],
    [messagesById],
  )

  const hasMoreMessages = useCallback(
    (conversationId: string) => hasMoreById[conversationId] ?? false,
    [hasMoreById],
  )

  const loadMessages = useCallback(async (conversationId: string) => {
    activeConversationRef.current = conversationId
    const res = await api.listMessages(conversationId, { limit: PAGE_SIZE })
    setMessagesById((current) => ({
      ...current,
      [conversationId]: res.messages,
    }))
    setHasMoreById((current) => ({
      ...current,
      [conversationId]: res.messages.length >= PAGE_SIZE,
    }))
    pruneMessageCache(conversationId)
    return res.messages
  }, [pruneMessageCache])

  const loadOlderMessages = useCallback(async (conversationId: string) => {
    const existing = messagesById[conversationId] ?? []
    const oldest = existing[0]
    if (!oldest) return existing

    const res = await api.listMessages(conversationId, {
      before: oldest.createdAt,
      limit: PAGE_SIZE,
    })
    const older = res.messages
    setHasMoreById((current) => ({
      ...current,
      [conversationId]: older.length >= PAGE_SIZE,
    }))
    setMessagesById((current) => {
      const list = current[conversationId] ?? []
      const seen = new Set(list.map((item) => item.id))
      const merged = [...older.filter((item) => !seen.has(item.id)), ...list]
      return { ...current, [conversationId]: merged }
    })
    return older
  }, [messagesById])

  const sendMessage = useCallback(async (conversationId: string, body: string) => {
    if (!user) throw new Error('未登录')

    const optimisticId = `optimistic:${crypto.randomUUID()}`
    const optimistic: ChatMessage = {
      id: optimisticId,
      conversationId,
      senderId: user.id,
      body,
      createdAt: Date.now(),
    }

    setMessagesById((current) => ({
      ...current,
      [conversationId]: [...(current[conversationId] ?? []), optimistic],
    }))
    setConversations((current) =>
      bumpConversation(current, conversationId, {
        lastMessageAt: optimistic.createdAt,
        lastMessageBody: body,
      }),
    )

    try {
      const res = await api.sendMessage(conversationId, body)
      setMessagesById((current) => {
        const list = current[conversationId] ?? []
        const withoutOptimistic = list.filter((item) => item.id !== optimisticId)
        if (withoutOptimistic.some((item) => item.id === res.message.id)) {
          return { ...current, [conversationId]: withoutOptimistic }
        }
        return {
          ...current,
          [conversationId]: [...withoutOptimistic, res.message],
        }
      })
      setConversations((current) =>
        bumpConversation(current, conversationId, {
          lastMessageAt: res.message.createdAt,
          lastMessageBody: res.message.body,
        }),
      )
      return res.message
    } catch (error) {
      setMessagesById((current) => ({
        ...current,
        [conversationId]: (current[conversationId] ?? []).filter(
          (item) => item.id !== optimisticId,
        ),
      }))
      throw error
    }
  }, [user])

  const markRead = useCallback(async (conversationId: string) => {
    await api.markConversationRead(conversationId)
    setConversations((current) =>
      bumpConversation(current, conversationId, { unreadCount: 0 }),
    )
  }, [])

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      loading,
      refreshConversations,
      openConversationWith,
      getMessages,
      hasMoreMessages,
      loadMessages,
      loadOlderMessages,
      sendMessage,
      markRead,
    }),
    [
      conversations,
      loading,
      refreshConversations,
      openConversationWith,
      getMessages,
      hasMoreMessages,
      loadMessages,
      loadOlderMessages,
      sendMessage,
      markRead,
    ],
  )

  return (
    <UnreadTotalContext.Provider value={unreadTotal}>
      <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
    </UnreadTotalContext.Provider>
  )
}

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext)
  if (!value) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return value
}

/** Layout 等只关心未读数，避免消息缓存变更引起导航重渲 */
export function useUnreadTotal(): number {
  return useContext(UnreadTotalContext)
}
