import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { usePresence } from '@/hooks/usePresence'
import type { PresenceState } from '@/types/user'

const PresenceContext = createContext<PresenceState>({})

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const presence = usePresence(Boolean(user))

  return <PresenceContext.Provider value={presence}>{children}</PresenceContext.Provider>
}

export function usePresenceState(): PresenceState {
  return useContext(PresenceContext)
}
