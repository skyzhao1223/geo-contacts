import { useEffect, useRef, useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useChat } from '@/context/ChatContext'
import { usePresenceState } from '@/context/PresenceContext'
import { isUserOnline } from '@/lib/presence'
import type { ConversationSummary } from '@/types/message'
import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'

interface ChatViewProps {
  conversation: ConversationSummary
  onBack?: () => void
}

export function ChatView({ conversation, onBack }: ChatViewProps) {
  const { user } = useAuth()
  const presence = usePresenceState()
  const { getMessages, loadMessages, sendMessage, markRead } = useChat()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const messages = getMessages(conversation.id)
  const online = isUserOnline(presence, conversation.peer.id, conversation.peer.online)

  useEffect(() => {
    void loadMessages(conversation.id).then(() => markRead(conversation.id))
  }, [conversation.id, loadMessages, markRead])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  const handleSend = async () => {
    const body = draft.trim()
    if (!body || !conversation.canMessage) return
    setSending(true)
    try {
      await sendMessage(conversation.id, body)
      setDraft('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-view">
      <header className="chat-header">
        {onBack && (
          <button type="button" className="button-ghost" onClick={onBack}>
            返回
          </button>
        )}
        <Avatar
          name={conversation.peer.displayName}
          src={conversation.peer.avatar ?? undefined}
          size="sm"
          online={online}
        />
        <div className="chat-header-main">
          <strong>{conversation.peer.displayName}</strong>
          <OnlineBadge online={online} lastSeenAt={conversation.peer.lastSeenAt} compact />
        </div>
      </header>

      <div className="chat-messages">
        {messages.map((message) => {
          const mine = message.senderId === user?.id
          return (
            <div
              key={message.id}
              className={`chat-bubble ${mine ? 'chat-bubble-mine' : 'chat-bubble-theirs'}`}
            >
              <p>{message.body}</p>
              <time>
                {new Date(message.createdAt).toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div className="chat-composer">
        {!conversation.canMessage && (
          <p className="chat-readonly-hint">已不是好友，会话只读</p>
        )}
        <div className="chat-composer-row">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={conversation.canMessage ? '输入消息…' : '无法发送'}
            disabled={!conversation.canMessage || sending}
            maxLength={2000}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                void handleSend()
              }
            }}
          />
          <button
            type="button"
            className="button-primary"
            disabled={!conversation.canMessage || sending || !draft.trim()}
            onClick={() => void handleSend()}
          >
            <Send size={16} />
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
