import { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { PresenceProvider } from '@/context/PresenceContext'
import { Layout, ProtectedRoute, PublicOnlyRoute } from '@/components/layout'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const ContactDetailPage = lazy(() =>
  import('@/pages/ContactDetailPage').then((m) => ({ default: m.ContactDetailPage })),
)
const ContactsPage = lazy(() =>
  import('@/pages/ContactsPage').then((m) => ({ default: m.ContactsPage })),
)
const FamilyPage = lazy(() =>
  import('@/pages/FamilyPage').then((m) => ({ default: m.FamilyPage })),
)
const FriendsPage = lazy(() =>
  import('@/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })),
)
const ImportPage = lazy(() =>
  import('@/pages/ImportPage').then((m) => ({ default: m.ImportPage })),
)
const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const MapPage = lazy(() =>
  import('@/pages/MapPage').then((m) => ({ default: m.MapPage })),
)
const MessagesPage = lazy(() =>
  import('@/pages/MessagesPage').then((m) => ({ default: m.MessagesPage })),
)
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
)
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

function PageFallback() {
  return (
    <div className="empty-state" role="status" aria-label="加载中">
      <div className="loading-spinner" />
    </div>
  )
}

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <ErrorBoundary fallbackTitle="应用出错了">
      <AuthProvider>
        <PresenceProvider>
          <BrowserRouter basename={basename}>
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route element={<PublicOnlyRoute />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                </Route>

                <Route element={<ProtectedRoute />}>
                  <Route element={<Layout />}>
                    <Route index element={<ContactsPage />} />
                    <Route path="friends" element={<FriendsPage />} />
                    <Route path="family" element={<FamilyPage />} />
                    <Route path="messages" element={<MessagesPage />} />
                    <Route path="messages/:conversationId" element={<MessagesPage />} />
                    <Route path="map" element={<MapPage />} />
                    <Route path="import" element={<ImportPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="settings" element={<SettingsPage />} />
                    <Route path="contacts/:id" element={<ContactDetailPage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </PresenceProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
