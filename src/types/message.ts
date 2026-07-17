import type { UserProfile } from './user'

export interface ChatMessage {
  id: string
  conversationId: string
  senderId: string
  body: string
  createdAt: number
}

export interface ConversationSummary {
  id: string
  peer: UserProfile
  lastMessageAt: number | null
  lastMessageBody: string | null
  unreadCount: number
  canMessage: boolean
  createdAt: number
}
