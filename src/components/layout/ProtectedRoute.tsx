import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { ContactsProvider } from '@/context/ContactsContext'
import { KinshipsProvider } from '@/context/KinshipsContext'
import { ChatProvider } from '@/context/ChatContext'
import { ensureUserDatabase } from '@/local-db/database'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const [dbReady, setDbReady] = useState(false)

  useEffect(() => {
    if (!user) {
      setDbReady(false)
      return
    }

    let cancelled = false
    setDbReady(false)
    void ensureUserDatabase(user.id)
      .then(() => {
        if (!cancelled) setDbReady(true)
      })
      .catch((error) => {
        console.error('打开本地数据库失败', error)
        if (!cancelled) setDbReady(false)
      })

    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (loading || (user && !dbReady)) {
    return (
      <div className="empty-state" role="status" aria-label="加载中">
        加载中...
      </div>
    )
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
    return (
      <div className="empty-state" role="status" aria-label="加载中">
        加载中...
      </div>
    )
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
