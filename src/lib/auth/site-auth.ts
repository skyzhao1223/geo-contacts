export interface SiteSession {
  username: string
  displayName: string
  role: string
  provider?: string
}

const SESSION_KEY = 'zhaosky_session'

type ZhaoskyWindow = Window & {
  ZhaoskyAuth?: {
    getSession: () => SiteSession | null
    logout: () => void
    refresh: () => Promise<SiteSession | null>
  }
  __ZHAOSKY_SESSION__?: SiteSession
}

export function readSiteSession(): SiteSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const win = window as ZhaoskyWindow

  try {
    const fromBridge = win.ZhaoskyAuth?.getSession?.()
    if (fromBridge?.username) {
      return fromBridge
    }

    if (win.__ZHAOSKY_SESSION__?.username) {
      return win.__ZHAOSKY_SESSION__
    }

    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as SiteSession) : null
  } catch {
    return null
  }
}

export function waitForSiteSession(timeoutMs = 8000): Promise<SiteSession | null> {
  const existing = readSiteSession()
  if (existing) {
    return Promise.resolve(existing)
  }

  if (typeof window === 'undefined') {
    return Promise.resolve(null)
  }

  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('zhaosky:session', handler)
      resolve(readSiteSession())
    }, timeoutMs)

    const handler = (event: Event) => {
      window.clearTimeout(timer)
      window.removeEventListener('zhaosky:session', handler)
      const detail = (event as CustomEvent<SiteSession>).detail
      resolve(detail ?? readSiteSession())
    }

    window.addEventListener('zhaosky:session', handler)
    void (window as ZhaoskyWindow).ZhaoskyAuth?.refresh?.()
  })
}

export function hasZhaoskyAuthBridge(): boolean {
  return typeof window !== 'undefined' && Boolean((window as ZhaoskyWindow).ZhaoskyAuth)
}

export function logoutSite() {
  const win = window as ZhaoskyWindow
  if (win.ZhaoskyAuth?.logout) {
    win.ZhaoskyAuth.logout()
    return
  }

  const next = `${window.location.pathname}${window.location.search}`
  window.location.href = `/logout?next=${encodeURIComponent(next)}`
}

export function redirectToSiteLogin() {
  const next = `${window.location.pathname}${window.location.search}`
  window.location.href = `/login?next=${encodeURIComponent(next)}`
}
