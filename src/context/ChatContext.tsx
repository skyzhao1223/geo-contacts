import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import { subscribeChatEvents } from '@/hooks/usePresence'
import type { ChatMessage, ConversationSummary } from '@/types/message'

export interface ChatContextValue {
  conversations: ConversationSummary[]
  unreadTotal: number
  loading: boolean
  refreshConversations: () => Promise<void>
  openConversationWith: (peerUserId: string) => Promise<ConversationSummary>
  getMessages: (conversationId: string) => ChatMessage[]
  loadMessages: (conversationId: string) => Promise<ChatMessage[]>
  sendMessage: (conversationId: string, body: string) => Promise<ChatMessage>
  markRead: (conversationId: string) => Promise<void>
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [messagesById, setMessagesById] = useState<Record<string, ChatMessage[]>>({})
  const [loading, setLoading] = useState(false)

  const refreshConversations = useCallback(async () => {
    if (!user) {
      setConversations([])
      return
    }
    setLoading(true)
    try {
      const res = await api.listConversations()
      setConversations(res.conversations)
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
        setMessagesById((current) => {
          const list = current[conversationId] ?? []
          if (list.some((item) => item.id === message.id)) return current
          return {
            ...current,
            [conversationId]: [...list, message],
          }
        })
        void refreshConversations()
      }
      if (event.type === 'chat_read') {
        void refreshConversations()
      }
    })
  }, [refreshConversations])

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

  const loadMessages = useCallback(async (conversationId: string) => {
    const res = await api.listMessages(conversationId)
    setMessagesById((current) => ({
      ...current,
      [conversationId]: res.messages,
    }))
    return res.messages
  }, [])

  const sendMessage = useCallback(async (conversationId: string, body: string) => {
    const res = await api.sendMessage(conversationId, body)
    setMessagesById((current) => {
      const list = current[conversationId] ?? []
      if (list.some((item) => item.id === res.message.id)) return current
      return {
        ...current,
        [conversationId]: [...list, res.message],
      }
    })
    await refreshConversations()
    return res.message
  }, [refreshConversations])

  const markRead = useCallback(async (conversationId: string) => {
    await api.markConversationRead(conversationId)
    setConversations((current) =>
      current.map((item) =>
        item.id === conversationId ? { ...item, unreadCount: 0 } : item,
      ),
    )
  }, [])

  const unreadTotal = useMemo(
    () => conversations.reduce((sum, item) => sum + item.unreadCount, 0),
    [conversations],
  )

  const value = useMemo<ChatContextValue>(
    () => ({
      conversations,
      unreadTotal,
      loading,
      refreshConversations,
      openConversationWith,
      getMessages,
      loadMessages,
      sendMessage,
      markRead,
    }),
    [
      conversations,
      unreadTotal,
      loading,
      refreshConversations,
      openConversationWith,
      getMessages,
      loadMessages,
      sendMessage,
      markRead,
    ],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

export function useChat(): ChatContextValue {
  const value = useContext(ChatContext)
  if (!value) {
    throw new Error('useChat must be used within ChatProvider')
  }
  return value
}
