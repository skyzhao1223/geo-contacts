import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  deleteKinship,
  getAllKinships,
  saveKinship,
} from '@/local-db/database'
import {
  KINSHIPS_UPDATED_EVENT,
  broadcastKinshipsUpdated,
  notifyContactsUpdated,
} from '@/lib/contacts/contacts-events'
import { syncFamilySystemTags } from '@/lib/family/system-tags'
import {
  createKinship,
  normalizeSpousePair,
  type Kinship,
  type ParentRole,
} from '@/types/kinship'

export interface KinshipsContextValue {
  kinships: Kinship[]
  loading: boolean
  refresh: (options?: { silent?: boolean }) => Promise<void>
  setParent: (
    childId: string,
    parentId: string,
    role?: ParentRole,
  ) => Promise<Kinship>
  removeParent: (childId: string, parentId: string) => Promise<void>
  setSpouse: (a: string, b: string) => Promise<Kinship>
  removeSpouse: (a: string, b: string) => Promise<void>
  removeKinshipById: (id: string) => Promise<void>
  getKinshipsOf: (contactId: string) => Kinship[]
}

const KinshipsContext = createContext<KinshipsContextValue | null>(null)

async function syncTagsAndNotifyContacts(): Promise<void> {
  const updated = await syncFamilySystemTags()
  if (updated > 0) {
    notifyContactsUpdated()
  }
}

export function KinshipsProvider({ children }: { children: ReactNode }) {
  const [kinships, setKinships] = useState<Kinship[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      setKinships(await getAllKinships())
      await syncTagsAndNotifyContacts()
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onUpdated = () => {
      void refresh({ silent: true })
    }
    window.addEventListener(KINSHIPS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(KINSHIPS_UPDATED_EVENT, onUpdated)
  }, [refresh])

  const setParent = useCallback(
    async (childId: string, parentId: string, role: ParentRole = 'parent') => {
      if (childId === parentId) {
        throw new Error('不能将自己设为父母')
      }

      const existing = kinships.find(
        (k) => k.type === 'parent' && k.fromId === childId && k.toId === parentId,
      )
      const next = createKinship({
        id: existing?.id,
        fromId: childId,
        toId: parentId,
        type: 'parent',
        role,
        createdAt: existing?.createdAt,
      })
      await saveKinship(next)
      setKinships((current) => {
        const others = current.filter((item) => item.id !== next.id)
        return [...others, next]
      })
      await syncTagsAndNotifyContacts()
      broadcastKinshipsUpdated()
      return next
    },
    [kinships],
  )

  const removeParent = useCallback(
    async (childId: string, parentId: string) => {
      const existing = kinships.find(
        (k) => k.type === 'parent' && k.fromId === childId && k.toId === parentId,
      )
      if (existing) {
        await deleteKinship(existing.id)
        setKinships((current) => current.filter((item) => item.id !== existing.id))
        await syncTagsAndNotifyContacts()
        broadcastKinshipsUpdated()
      }
    },
    [kinships],
  )

  const setSpouse = useCallback(
    async (a: string, b: string) => {
      if (a === b) throw new Error('不能将自己设为配偶')
      const { fromId, toId } = normalizeSpousePair(a, b)
      const existing = kinships.find(
        (k) => k.type === 'spouse' && k.fromId === fromId && k.toId === toId,
      )
      const next = createKinship({
        id: existing?.id,
        fromId,
        toId,
        type: 'spouse',
        createdAt: existing?.createdAt,
      })
      await saveKinship(next)
      setKinships((current) => {
        const others = current.filter((item) => item.id !== next.id)
        return [...others, next]
      })
      await syncTagsAndNotifyContacts()
      broadcastKinshipsUpdated()
      return next
    },
    [kinships],
  )

  const removeSpouse = useCallback(
    async (a: string, b: string) => {
      const { fromId, toId } = normalizeSpousePair(a, b)
      const existing = kinships.find(
        (k) => k.type === 'spouse' && k.fromId === fromId && k.toId === toId,
      )
      if (existing) {
        await deleteKinship(existing.id)
        setKinships((current) => current.filter((item) => item.id !== existing.id))
        await syncTagsAndNotifyContacts()
        broadcastKinshipsUpdated()
      }
    },
    [kinships],
  )

  const removeKinshipById = useCallback(async (id: string) => {
    await deleteKinship(id)
    setKinships((current) => current.filter((item) => item.id !== id))
    await syncTagsAndNotifyContacts()
    broadcastKinshipsUpdated()
  }, [])

  const getKinshipsOf = useCallback(
    (contactId: string) =>
      kinships.filter((k) => k.fromId === contactId || k.toId === contactId),
    [kinships],
  )

  const value = useMemo<KinshipsContextValue>(
    () => ({
      kinships,
      loading,
      refresh,
      setParent,
      removeParent,
      setSpouse,
      removeSpouse,
      removeKinshipById,
      getKinshipsOf,
    }),
    [
      kinships,
      loading,
      refresh,
      setParent,
      removeParent,
      setSpouse,
      removeSpouse,
      removeKinshipById,
      getKinshipsOf,
    ],
  )

  return <KinshipsContext.Provider value={value}>{children}</KinshipsContext.Provider>
}

export function useKinships(): KinshipsContextValue {
  const value = useContext(KinshipsContext)
  if (!value) {
    throw new Error('useKinships must be used within KinshipsProvider')
  }
  return value
}
