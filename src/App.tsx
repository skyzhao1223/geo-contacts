import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext'
import { PresenceProvider } from '@/context/PresenceContext'
import { Layout, ProtectedRoute, PublicOnlyRoute } from '@/components/layout'
import { ContactDetailPage } from '@/pages/ContactDetailPage'
import { ContactsPage } from '@/pages/ContactsPage'
import { FamilyPage } from '@/pages/FamilyPage'
import { FriendsPage } from '@/pages/FriendsPage'
import { ImportPage } from '@/pages/ImportPage'
import { LoginPage } from '@/pages/LoginPage'
import { MapPage } from '@/pages/MapPage'
import { MessagesPage } from '@/pages/MessagesPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { RegisterPage } from '@/pages/RegisterPage'
import { SettingsPage } from '@/pages/SettingsPage'

export default function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

  return (
    <AuthProvider>
      <PresenceProvider>
        <BrowserRouter basename={basename}>
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
        </BrowserRouter>
      </PresenceProvider>
    </AuthProvider>
  )
}
