import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Map, Users, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { AuthLayout } from '@/components/auth'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <AuthLayout
      heroTitle="GeoContacts"
      heroDescription="注册后自动获得示例联系人与族谱，立刻体验地图分布、家庭关系与好友私信。"
      features={[
        { icon: <Sparkles size={18} />, text: '注册即送示例数据与族谱' },
        { icon: <Users size={18} />, text: '搜索平台用户，建立好友关系' },
        { icon: <Map size={18} />, text: '在地图上看人脉地理分布' },
      ]}
      panelTitle="创建账号"
      panelDescription="填写基本信息，马上开始管理你的地理通讯录。"
      footer={
        <p className="auth-switch">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      }
    >
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          setLoading(true)
          setError('')
          void register(email, password, displayName)
            .then(() => navigate('/'))
            .catch((err) => {
              setError(err instanceof ApiError ? err.message : '注册失败')
            })
            .finally(() => setLoading(false))
        }}
      >
        <label className="field">
          <span>昵称</span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="你的称呼"
            required
          />
        </label>
        <label className="field">
          <span>邮箱</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="field">
          <span>密码</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="至少 6 位"
            minLength={6}
            required
          />
        </label>
        {error && <div className="status-banner error-banner">{error}</div>}
        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? '注册中...' : '注册并开始'}
        </button>
      </form>
    </AuthLayout>
  )
}
