import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, UserCheck, Clock3, MessageCircle } from 'lucide-react'
import { api } from '@/lib/api'
import { usePresenceState } from '@/context/PresenceContext'
import { useContacts } from '@/context/ContactsContext'
import { useChat } from '@/context/ChatContext'
import { isUserOnline } from '@/lib/presence'
import type { FriendItem, FriendRequestItem, UserProfile } from '@/types/user'
import { PageHeader, EmptyState } from '@/components/ui'
import { UserCard } from '@/components/friends'
import { createEmptyContact } from '@/types/contact'

export function FriendsPage() {
  const navigate = useNavigate()
  const presence = usePresenceState()
  const { contacts, importContacts } = useContacts()
  const { openConversationWith } = useChat()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [friends, setFriends] = useState<FriendItem[]>([])
  const [incoming, setIncoming] = useState<FriendRequestItem[]>([])
  const [outgoing, setOutgoing] = useState<FriendRequestItem[]>([])
  const [message, setMessage] = useState('')

  const refresh = async () => {
    const [friendsRes, requestsRes] = await Promise.all([
      api.listFriends(),
      api.listFriendRequests(),
    ])
    setFriends(friendsRes.friends)
    setIncoming(requestsRes.incoming)
    setOutgoing(requestsRes.outgoing)
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const timer = window.setTimeout(() => {
      void api.searchUsers(query).then((res) => setSearchResults(res.users))
    }, 300)

    return () => window.clearTimeout(timer)
  }, [query])

  const linkToContacts = async (friend: UserProfile) => {
    const existing = contacts.find((contact) => contact.linkedUserId === friend.id)
    if (existing) {
      setMessage(`${friend.displayName} 已关联到通讯录`)
      return
    }

    await importContacts([
      createEmptyContact({
        name: friend.displayName,
        emails: friend.email ? [friend.email] : [],
        avatar: friend.avatar ?? undefined,
        birthplace: friend.birthplace ?? undefined,
        hometown: friend.hometown ?? undefined,
        currentLocation: friend.currentLocation ?? undefined,
        linkedUserId: friend.id,
        tags: ['平台好友'],
        source: 'platform-user',
      }),
    ])
    setMessage(`已将 ${friend.displayName} 添加到通讯录`)
  }

  const startChat = async (friend: UserProfile) => {
    try {
      const conversation = await openConversationWith(friend.id)
      navigate(`/messages/${conversation.id}`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法发起会话')
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="平台好友"
        description="搜索用户、处理请求，并发消息或关联到通讯录。"
        compact
      />

      <section className="panel">
        <div className="search-box">
          <UserPlus size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索昵称或邮箱..."
          />
        </div>

        {searchResults.length > 0 && (
          <div className="friend-section">
            <h3 className="section-title">搜索结果</h3>
            {searchResults.map((result) => (
              <UserCard
                key={result.id}
                user={result}
                online={isUserOnline(presence, result.id, result.online)}
                actions={
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() =>
                      void api.sendFriendRequest(result.id).then(() => {
                        setMessage(`已向 ${result.displayName} 发送好友请求`)
                        void refresh()
                      })
                    }
                  >
                    加好友
                  </button>
                }
              />
            ))}
          </div>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>好友请求</h2>
              <p>{incoming.length} 条待处理</p>
            </div>
          </div>
          <div className="friend-section">
            {incoming.map((item) => (
              <UserCard
                key={item.friendshipId}
                user={item.user}
                online={isUserOnline(presence, item.user.id, item.user.online)}
                actions={
                  <div className="button-row">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() =>
                        void api.acceptFriendRequest(item.friendshipId).then(() => {
                          setMessage(`已接受 ${item.user.displayName} 的好友请求`)
                          void refresh()
                        })
                      }
                    >
                      接受
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() =>
                        void api.rejectFriendRequest(item.friendshipId).then(() => refresh())
                      }
                    >
                      拒绝
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>我的好友</h2>
            <p>{friends.length} 位平台好友</p>
          </div>
        </div>

        {friends.length === 0 ? (
          <EmptyState
            icon={<UserPlus size={24} />}
            title="还没有平台好友"
            description="在上方搜索框输入昵称或邮箱，找到用户后发送好友请求。"
          />
        ) : (
          <div className="friend-section">
            {friends.map((item) => (
              <UserCard
                key={item.friendshipId}
                user={item.user}
                online={isUserOnline(presence, item.user.id, item.user.online)}
                actions={
                  <div className="button-row">
                    <button
                      type="button"
                      className="button-primary"
                      onClick={() => void startChat(item.user)}
                    >
                      <MessageCircle size={16} />
                      发消息
                    </button>
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() => void linkToContacts(item.user)}
                    >
                      <UserCheck size={16} />
                      关联通讯录
                    </button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </section>

      {outgoing.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>已发送请求</h2>
              <p>等待对方确认</p>
            </div>
          </div>
          <div className="friend-section">
            {outgoing.map((item) => (
              <UserCard
                key={item.friendshipId}
                user={item.user}
                online={isUserOnline(presence, item.user.id, item.user.online)}
                actions={
                  <span className="pending-badge">
                    <Clock3 size={14} />
                    等待确认
                  </span>
                }
              />
            ))}
          </div>
        </section>
      )}

      {message && <div className="status-banner">{message}</div>}
    </div>
  )
}
