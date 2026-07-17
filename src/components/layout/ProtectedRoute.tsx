import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ContactsProvider } from '@/context/ContactsContext'
import { KinshipsProvider } from '@/context/KinshipsContext'
import { ChatProvider } from '@/context/ChatContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="empty-state">加载中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <ContactsProvider>
      <KinshipsProvider>
        <ChatProvider>
          <Outlet />
        </ChatProvider>
      </KinshipsProvider>
    </ContactsProvider>
  )
}

export function PublicOnlyRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="empty-state">加载中...</div>
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
