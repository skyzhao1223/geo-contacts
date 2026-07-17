import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Map, Users, Sparkles } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import { AuthLayout } from '@/components/auth'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <AuthLayout
      heroTitle="GeoContacts"
      heroDescription="把通讯录放上地图：管理籍贯与现居地、梳理族谱，并和平台好友私信联络。"
      features={[
        { icon: <Users size={18} />, text: '导入 vCard / CSV，一键合并去重' },
        { icon: <Map size={18} />, text: '地图查看籍贯与现居地分布' },
        { icon: <Sparkles size={18} />, text: '族谱关系与好友私信' },
      ]}
      panelTitle="欢迎回来"
      panelDescription="登录后同步在线状态，并把平台好友关联到本地通讯录。"
      footer={
        <p className="auth-switch">
          还没有账号？<Link to="/register">立即注册</Link>
        </p>
      }
    >
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault()
          setLoading(true)
          setError('')
          void login(email, password)
            .then(() => navigate('/'))
            .catch((err) => {
              setError(err instanceof ApiError ? err.message : '登录失败')
            })
            .finally(() => setLoading(false))
        }}
      >
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
            required
          />
        </label>
        {error && <div className="status-banner error-banner">{error}</div>}
        <button type="submit" className="button-primary" disabled={loading}>
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
    </AuthLayout>
  )
}
