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
import {
  hasZhaoskyAuthBridge,
  logoutSite,
  waitForSiteSession,
} from '@/lib/site-auth'
import type { UserProfile } from '@/types/user'

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  loginWithSiteSession: () => Promise<boolean>
  logout: () => void
  refreshUser: () => Promise<void>
  updateProfile: (payload: Partial<UserProfile>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readHasSiteCookieHint(): boolean {
  try {
    return Boolean(sessionStorage.getItem('zhaosky_session'))
  } catch {
    return false
  }
}

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

  const loginWithSiteSession = useCallback(async () => {
    const { token, user: profile } = await api.sso()
    setToken(token)
    setUser(profile)
    return true
  }, [])

  useEffect(() => {
    void (async () => {
      const isSiteDeploy = (import.meta.env.BASE_URL || '').includes('geo-contacts')
      const waitMs = isSiteDeploy || hasZhaoskyAuthBridge() ? 10000 : 400

      try {
        // 生产环境有 project-guard：等站内会话写入后再换本应用 JWT
        const site = await waitForSiteSession(waitMs)
        if (site?.username) {
          await loginWithSiteSession()
          return
        }

        // sessionStorage 尚未就绪时，仍可用 dashboard_session Cookie 直接换票
        if (isSiteDeploy || hasZhaoskyAuthBridge()) {
          try {
            await loginWithSiteSession()
            return
          } catch {
            // 无站内会话，继续走本地 token
          }
        }

        await refreshUser()
      } catch {
        try {
          await refreshUser()
        } catch {
          setToken(null)
          setUser(null)
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [loginWithSiteSession, refreshUser])

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
    if (hasZhaoskyAuthBridge() || readHasSiteCookieHint()) {
      logoutSite()
    }
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
      loginWithSiteSession,
      logout,
      refreshUser,
      updateProfile,
    }),
    [
      user,
      loading,
      login,
      register,
      loginWithSiteSession,
      logout,
      refreshUser,
      updateProfile,
    ],
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
