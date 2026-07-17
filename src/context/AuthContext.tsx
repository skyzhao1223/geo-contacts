import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { api, getToken, setToken } from '@/lib/api'
import { seedDemoDataIfNeeded } from '@/lib/seed-demo-data'
import type { UserProfile } from '@/types/user'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  updateProfile: (payload: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getToken()
    if (!token) {
      setUser(null)
      return
    }

    const { user: profile } = await api.me()
    setUser(profile)
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        await refreshUser()
      } catch {
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshUser])

  useEffect(() => {
    if (!user) return
    void seedDemoDataIfNeeded(user.id, user.displayName).then(async (count) => {
      if (count > 0) {
        const refreshed = await api.me()
        setUser(refreshed.user)
      }
    })
  }, [user?.id])

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: profile } = await api.login(email, password)
    setToken(token)
    setUser(profile)
  }, [])

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const { token, user: profile } = await api.register(email, password, displayName)
      setToken(token)
      setUser(profile)
      await seedDemoDataIfNeeded(profile.id, displayName)
      const refreshed = await api.me()
      setUser(refreshed.user)
    },
    [],
  )

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const updateProfile = useCallback(async (payload: Partial<UserProfile>) => {
    const { user: profile } = await api.updateProfile(payload)
    setUser(profile)
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      updateProfile,
    }),
    [user, loading, login, register, logout, refreshUser, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
