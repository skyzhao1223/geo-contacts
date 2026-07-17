import { useEffect, useMemo, useState } from 'react'
import { MessageCircle, Search, UserPlus, X } from 'lucide-react'
import { api } from '@/lib/api'
import { usePresenceState } from '@/context/PresenceContext'
import { isUserOnline } from '@/lib/presence'
import type { FriendItem, UserProfile } from '@/types/user'
import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'
import { EmptyState } from '@/components/ui'

interface NewChatPickerProps {
  open: boolean
  onClose: () => void
  onSelect: (user: UserProfile) => Promise<void>
}

export function NewChatPicker({ open, onClose, onSelect }: NewChatPickerProps) {
  const presence = usePresenceState()
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    void api
      .listFriends()
      .then((res) => setFriends(res.friends))
      .catch((err: Error) => setError(err.message || '加载好友失败'))
      .finally(() => setLoading(false))
  }, [open])

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return friends
    return friends.filter((item) => {
      const hay = [item.user.displayName, item.user.email]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(keyword)
    })
  }, [friends, query])

  if (!open) return null

  return (
    <div className="new-chat-backdrop" role="presentation" onClick={onClose}>
      <div
        className="new-chat-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="发起聊天"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="new-chat-header">
          <div>
            <h2>发起聊天</h2>
            <p>选择一位好友开始私信</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="search-box new-chat-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索好友昵称…"
            autoFocus
          />
        </div>

        {loading ? (
          <div className="empty-state">加载中...</div>
        ) : friends.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={24} />}
            title="还没有好友"
            description="先添加平台好友，才能发起私信。"
            action={{ label: '去加好友', to: '/friends' }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={24} />}
            title="没有匹配的好友"
            description="换个关键词试试。"
          />
        ) : (
          <ul className="new-chat-list">
            {filtered.map((item) => {
              const online = isUserOnline(presence, item.user.id, item.user.online)
              return (
                <li key={item.friendshipId}>
                  <button
                    type="button"
                    className="new-chat-row"
                    disabled={busyId === item.user.id}
                    onClick={() => {
                      setBusyId(item.user.id)
                      setError('')
                      void onSelect(item.user)
                        .catch((err: Error) => setError(err.message || '无法发起会话'))
                        .finally(() => setBusyId(null))
                    }}
                  >
                    <Avatar
                      name={item.user.displayName}
                      src={item.user.avatar ?? undefined}
                      size="md"
                      online={online}
                    />
                    <div className="new-chat-row-main">
                      <strong>{item.user.displayName}</strong>
                      <OnlineBadge online={online} lastSeenAt={item.user.lastSeenAt} compact />
                    </div>
                    <span className="new-chat-row-action">
                      <MessageCircle size={16} />
                      {busyId === item.user.id ? '打开中…' : '发消息'}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {error && <div className="error-banner status-banner">{error}</div>}
      </div>
    </div>
  )
}
