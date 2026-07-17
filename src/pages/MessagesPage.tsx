import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MessageCircle, Plus, UserPlus } from 'lucide-react'
import { useChat } from '@/context/ChatContext'
import { usePresenceState } from '@/context/PresenceContext'
import { isUserOnline } from '@/lib/presence'
import type { UserProfile } from '@/types/user'
import { ChatView } from '@/components/messages/ChatView'
import { NewChatPicker } from '@/components/messages/NewChatPicker'
import { PageHeader, EmptyState, Avatar, OnlineBadge } from '@/components/ui'

export function MessagesPage() {
  const { conversationId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const presence = usePresenceState()
  const { conversations, loading, openConversationWith } = useChat()
  const [mobileShowChat, setMobileShowChat] = useState(Boolean(conversationId))
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setPickerOpen(true)
      searchParams.delete('new')
      setSearchParams(searchParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const active = useMemo(
    () => conversations.find((item) => item.id === conversationId) ?? null,
    [conversations, conversationId],
  )

  const openConversation = (id: string) => {
    setMobileShowChat(true)
    navigate(`/messages/${id}`)
  }

  const backToList = () => {
    setMobileShowChat(false)
    navigate('/messages')
  }

  const startWithFriend = async (user: UserProfile) => {
    const conversation = await openConversationWith(user.id)
    setPickerOpen(false)
    openConversation(conversation.id)
  }

  if (loading && conversations.length === 0) {
    return <div className="empty-state">加载中...</div>
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="消息"
        description="与平台好友的一对一文字私信。"
        compact
        actions={
          <div className="button-row">
            <Link to="/friends" className="button-secondary">
              <UserPlus size={16} />
              好友
            </Link>
            <button
              type="button"
              className="button-primary"
              onClick={() => setPickerOpen(true)}
            >
              <Plus size={16} />
              发起聊天
            </button>
          </div>
        }
      />

      <div className={`messages-layout ${mobileShowChat && active ? 'show-chat' : ''}`}>
        <section className="panel messages-list-panel">
          {conversations.length === 0 ? (
            <div className="messages-empty">
              <EmptyState
                icon={<MessageCircle size={24} />}
                title="还没有会话"
                description="点「发起聊天」从好友里选人，或先去添加好友。"
              />
              <div className="messages-empty-cta">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setPickerOpen(true)}
                >
                  <Plus size={16} />
                  发起聊天
                </button>
                <Link to="/friends" className="button-secondary">
                  <UserPlus size={16} />
                  去加好友
                </Link>
              </div>
            </div>
          ) : (
            <ul className="conversation-list">
              {conversations.map((item) => {
                const online = isUserOnline(presence, item.peer.id, item.peer.online)
                const activeItem = item.id === conversationId
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`conversation-row ${activeItem ? 'is-active' : ''}`}
                      onClick={() => openConversation(item.id)}
                    >
                      <Avatar
                        name={item.peer.displayName}
                        src={item.peer.avatar ?? undefined}
                        size="md"
                        online={online}
                      />
                      <div className="conversation-main">
                        <div className="conversation-top">
                          <strong>{item.peer.displayName}</strong>
                          {item.lastMessageAt && (
                            <time>
                              {new Date(item.lastMessageAt).toLocaleDateString('zh-CN')}
                            </time>
                          )}
                        </div>
                        <div className="conversation-preview">
                          <span>{item.lastMessageBody ?? '暂无消息'}</span>
                          <OnlineBadge online={online} compact />
                        </div>
                      </div>
                      {item.unreadCount > 0 && (
                        <span className="unread-badge">{item.unreadCount}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="panel messages-chat-panel">
          {active ? (
            <ChatView conversation={active} onBack={backToList} />
          ) : (
            <EmptyState
              icon={<MessageCircle size={24} />}
              title="选择会话"
              description="从左侧打开对话，或点右上角「发起聊天」。"
            />
          )}
        </section>
      </div>

      <NewChatPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={startWithFriend}
      />
    </div>
  )
}
