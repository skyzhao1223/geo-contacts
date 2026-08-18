import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { usePresence } from '@/hooks/usePresence'
import { getLinkedOnline, isUserOnline } from '@/lib/presence'
import type { PresenceState } from '@/types/user'

type Listener = (changedUserIds: string[] | '*') => void

interface PresenceStore {
  getSnapshot: () => PresenceState
  subscribe: (listener: Listener) => () => void
}

const PresenceStoreContext = createContext<PresenceStore | null>(null)

export function PresenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const presence = usePresence(Boolean(user))
  const presenceRef = useRef(presence)
  const listenersRef = useRef(new Set<Listener>())

  useEffect(() => {
    const prev = presenceRef.current
    const changed: string[] = []
    const ids = new Set([...Object.keys(prev), ...Object.keys(presence)])
    for (const id of ids) {
      const a = prev[id]
      const b = presence[id]
      if (a?.online !== b?.online || a?.lastSeenAt !== b?.lastSeenAt) {
        changed.push(id)
      }
    }
    presenceRef.current = presence
    if (changed.length > 0) {
      for (const listener of listenersRef.current) {
        listener(changed)
      }
    }
  }, [presence])

  const subscribe = useCallback((listener: Listener) => {
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const getSnapshot = useCallback(() => presenceRef.current, [])

  const store = useMemo<PresenceStore>(
    () => ({ getSnapshot, subscribe }),
    [getSnapshot, subscribe],
  )

  return (
    <PresenceStoreContext.Provider value={store}>{children}</PresenceStoreContext.Provider>
  )
}

function usePresenceStore(): PresenceStore {
  const store = useContext(PresenceStoreContext)
  if (!store) {
    throw new Error('usePresenceStore must be used within PresenceProvider')
  }
  return store
}

/** 需要整表时使用（地图聚合等）；单点请用 useLinkedOnline */
export function usePresenceState(): PresenceState {
  const store = usePresenceStore()
  return useSyncExternalStore(
    (onStoreChange) => store.subscribe(() => onStoreChange()),
    store.getSnapshot,
    store.getSnapshot,
  )
}

/** 仅在该 userId 在线态变化时触发重渲染 */
export function useUserOnline(
  userId?: string,
  fallback?: boolean,
): boolean | undefined {
  const store = usePresenceStore()

  const subscribe = useCallback(
    (onChange: () => void) =>
      store.subscribe((changed) => {
        if (!userId) return
        if (changed === '*' || changed.includes(userId)) onChange()
      }),
    [store, userId],
  )

  const getSnapshot = useCallback(() => {
    if (!userId) return undefined as boolean | undefined
    const state = store.getSnapshot()
    if (state[userId] == null && fallback == null) return undefined
    return isUserOnline(state, userId, fallback)
  }, [store, userId, fallback])

  return useSyncExternalStore(subscribe, getSnapshot, () => undefined)
}

export function useLinkedOnline(linkedUserId?: string): boolean | undefined {
  return useUserOnline(linkedUserId)
}

export function readLinkedOnline(
  presence: PresenceState,
  linkedUserId?: string,
): boolean | undefined {
  return getLinkedOnline(presence, linkedUserId)
}
