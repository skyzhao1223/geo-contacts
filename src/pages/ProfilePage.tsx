import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Settings,
  Upload,
  LogOut,
  ChevronRight,
  MapPin,
  Network,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ContactForm } from '@/components/contacts'
import { PageHeader, Avatar } from '@/components/ui'
import { createEmptyContact, locationToText } from '@/types/contact'
import type { Contact } from '@/types/contact'

export function ProfilePage() {
  const { user, updateProfile, logout } = useAuth()
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)

  if (!user) return null

  const initial: Contact = createEmptyContact({
    id: user.id,
    name: user.displayName,
    emails: user.email ? [user.email] : [],
    avatar: user.avatar ?? undefined,
    notes: user.bio ?? undefined,
    birthplace: user.birthplace ?? undefined,
    hometown: user.hometown ?? undefined,
    currentLocation: user.currentLocation ?? undefined,
    tags: ['我的资料'],
    source: 'profile',
  })

  return (
    <div className="page-stack">
      <PageHeader
        title="我的"
        description="个人资料、族谱、好友与账号设置。"
        compact
      />

      <section className="panel profile-summary-card">
        <div className="profile-summary">
          <Avatar name={user.displayName} src={user.avatar ?? undefined} size="lg" />
          <div className="profile-summary-main">
            <h2>{user.displayName}</h2>
            <p>{user.email}</p>
            <div className="profile-location-line">
              <MapPin size={14} />
              <span>
                {locationToText(user.currentLocation ?? undefined) ||
                  locationToText(user.hometown ?? undefined) ||
                  '尚未填写现居地 / 籍贯'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setEditing((value) => !value)}
          >
            {editing ? '收起编辑' : '编辑资料'}
          </button>
        </div>

        {editing && (
          <div className="profile-edit-block">
            <ContactForm
              initial={initial}
              onSave={async (contact) => {
                await updateProfile({
                  displayName: contact.name,
                  avatar: contact.avatar,
                  bio: contact.notes,
                  birthplace: contact.birthplace,
                  hometown: contact.hometown,
                  currentLocation: contact.currentLocation,
                })
                setMessage('资料已更新')
                setEditing(false)
              }}
            />
          </div>
        )}

        {message && <div className="status-banner">{message}</div>}
      </section>

      <section className="panel">
        <h3 className="section-title">更多功能</h3>
        <div className="menu-list">
          <Link to="/family" className="menu-list-item">
            <span className="menu-list-icon">
              <Network size={18} />
            </span>
            <span className="menu-list-text">
              <strong>族谱</strong>
              <span>查看父母、配偶与世代关系</span>
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/friends" className="menu-list-item">
            <span className="menu-list-icon">
              <UserPlus size={18} />
            </span>
            <span className="menu-list-text">
              <strong>平台好友</strong>
              <span>搜索加友、发消息、关联通讯录</span>
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/import" className="menu-list-item">
            <span className="menu-list-icon">
              <Upload size={18} />
            </span>
            <span className="menu-list-text">
              <strong>导入联系人</strong>
              <span>从 vCard / CSV / JSON 导入</span>
            </span>
            <ChevronRight size={18} />
          </Link>
          <Link to="/settings" className="menu-list-item">
            <span className="menu-list-icon">
              <Settings size={18} />
            </span>
            <span className="menu-list-text">
              <strong>设置与备份</strong>
              <span>导出备份、示例数据、清空</span>
            </span>
            <ChevronRight size={18} />
          </Link>
          <button type="button" className="menu-list-item menu-list-button" onClick={logout}>
            <span className="menu-list-icon menu-list-icon-danger">
              <LogOut size={18} />
            </span>
            <span className="menu-list-text">
              <strong>退出登录</strong>
              <span>当前设备退出账号</span>
            </span>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>
    </div>
  )
}
