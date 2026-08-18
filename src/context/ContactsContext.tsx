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
  clearAllContacts,
  deleteContact,
  deleteContacts,
  getAllContacts,
  getContact,
  saveContact,
  saveContacts,
} from '@/local-db/database'
import {
  CONTACTS_UPDATED_EVENT,
  broadcastContactsUpdated,
  notifyKinshipsUpdated,
} from '@/lib/contacts/contacts-events'
import { mergeContacts } from '@/lib/contacts/dedup'
import { sortTagsForDisplay, SYSTEM_FAMILY_TAG, uniqueTags } from '@/lib/family/system-tags'
import type { Contact, DuplicateGroup } from '@/types/contact'

function sortContactsByName(list: Contact[]): Contact[] {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
}

export interface ContactsContextValue {
  contacts: Contact[]
  filteredContacts: Contact[]
  tags: string[]
  loading: boolean
  search: string
  setSearch: (value: string) => void
  selectedTag: string | null
  setSelectedTag: (tag: string | null) => void
  refresh: (options?: { silent?: boolean }) => Promise<void>
  getContactById: (id: string) => Promise<Contact | undefined>
  addContact: (contact: Contact) => Promise<void>
  updateContact: (contact: Contact) => Promise<void>
  removeContact: (id: string) => Promise<void>
  removeContacts: (ids: string[]) => Promise<void>
  addTagsToContacts: (ids: string[], tagsToAdd: string[]) => Promise<void>
  removeTagFromContacts: (ids: string[], tag: string) => Promise<void>
  importContacts: (incoming: Contact[]) => Promise<void>
  saveContactBatch: (contacts: Contact[]) => Promise<void>
  mergeGroup: (group: DuplicateGroup) => Promise<void>
  resetAll: () => Promise<void>
}

const ContactsContext = createContext<ContactsContextValue | null>(null)

export function ContactsProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 200)
    return () => window.clearTimeout(timer)
  }, [search])

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false
    if (!silent) setLoading(true)
    try {
      const data = await getAllContacts()
      setContacts(data)
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
    window.addEventListener(CONTACTS_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(CONTACTS_UPDATED_EVENT, onUpdated)
  }, [refresh])

  const tags = useMemo(() => {
    const all = contacts.flatMap((contact) => contact.tags)
    return sortTagsForDisplay([...new Set(all)])
  }, [contacts])

  const searchHaystacks = useMemo(() => {
    const map = new Map<string, string>()
    for (const contact of contacts) {
      map.set(
        contact.id,
        [
          contact.name,
          contact.company,
          contact.notes,
          ...contact.phones,
          ...contact.emails,
          ...contact.tags,
          contact.birthplace?.city,
          contact.hometown?.city,
          contact.currentLocation?.city,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      )
    }
    return map
  }, [contacts])

  const filteredContacts = useMemo(() => {
    const keyword = debouncedSearch.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (selectedTag && !contact.tags.includes(selectedTag)) return false
      if (!keyword) return true
      return searchHaystacks.get(contact.id)?.includes(keyword) ?? false
    })
  }, [contacts, debouncedSearch, selectedTag, searchHaystacks])

  const getContactById = useCallback(async (id: string) => {
    const cached = contacts.find((contact) => contact.id === id)
    if (cached) return cached
    return getContact(id)
  }, [contacts])

  const addContact = useCallback(async (contact: Contact) => {
    await saveContact(contact)
    setContacts((current) => sortContactsByName([...current.filter((item) => item.id !== contact.id), contact]))
    broadcastContactsUpdated()
  }, [])

  const updateContact = useCallback(async (contact: Contact) => {
    await saveContact(contact)
    setContacts((current) =>
      sortContactsByName(current.map((item) => (item.id === contact.id ? contact : item))),
    )
    broadcastContactsUpdated()
  }, [])

  const removeContact = useCallback(async (id: string) => {
    await deleteContact(id)
    setContacts((current) => current.filter((item) => item.id !== id))
    broadcastContactsUpdated()
    notifyKinshipsUpdated()
  }, [])

  const removeContacts = useCallback(async (ids: string[]) => {
    await deleteContacts(ids)
    const idSet = new Set(ids)
    setContacts((current) => current.filter((item) => !idSet.has(item.id)))
    broadcastContactsUpdated()
    notifyKinshipsUpdated()
  }, [])

  const addTagsToContacts = useCallback(async (ids: string[], tagsToAdd: string[]) => {
    const normalized = uniqueTags(tagsToAdd)
    if (ids.length === 0 || normalized.length === 0) return

    const idSet = new Set(ids)
    const updated = contacts
      .filter((contact) => idSet.has(contact.id))
      .map((contact) => ({
        ...contact,
        tags: uniqueTags([...contact.tags, ...normalized]),
      }))

    await saveContacts(updated)
    const byId = new Map(updated.map((item) => [item.id, item]))
    setContacts((current) =>
      sortContactsByName(current.map((item) => byId.get(item.id) ?? item)),
    )
    broadcastContactsUpdated()
  }, [contacts])

  const removeTagFromContacts = useCallback(async (ids: string[], tag: string) => {
    const target = tag.trim()
    if (ids.length === 0 || !target || target === SYSTEM_FAMILY_TAG) return

    const idSet = new Set(ids)
    const updated = contacts
      .filter((contact) => idSet.has(contact.id))
      .map((contact) => ({
        ...contact,
        tags: contact.tags.filter((item) => item !== target),
      }))

    await saveContacts(updated)
    const byId = new Map(updated.map((item) => [item.id, item]))
    setContacts((current) =>
      sortContactsByName(current.map((item) => byId.get(item.id) ?? item)),
    )
    broadcastContactsUpdated()
  }, [contacts])

  const importContacts = useCallback(async (incoming: Contact[]) => {
    await saveContacts(incoming)
    await refresh({ silent: true })
    broadcastContactsUpdated()
  }, [refresh])

  const saveContactBatch = useCallback(async (next: Contact[]) => {
    await saveContacts(next)
    const byId = new Map(next.map((item) => [item.id, item]))
    setContacts((current) =>
      sortContactsByName(current.map((item) => byId.get(item.id) ?? item)),
    )
    broadcastContactsUpdated()
  }, [])

  const mergeGroup = useCallback(async (group: DuplicateGroup) => {
    const selected = contacts.filter((contact) => group.contactIds.includes(contact.id))
    if (selected.length < 2) return

    const merged = mergeContacts(selected)
    const removeIds = selected.map((contact) => contact.id).filter((id) => id !== merged.id)

    await saveContact(merged)
    await deleteContacts(removeIds)
    const removeSet = new Set(removeIds)
    setContacts((current) =>
      sortContactsByName([
        ...current.filter((item) => !removeSet.has(item.id) && item.id !== merged.id),
        merged,
      ]),
    )
    broadcastContactsUpdated()
    notifyKinshipsUpdated()
  }, [contacts])

  const resetAll = useCallback(async () => {
    await clearAllContacts()
    setContacts([])
    broadcastContactsUpdated()
    notifyKinshipsUpdated()
  }, [])

  const value = useMemo<ContactsContextValue>(
    () => ({
      contacts,
      filteredContacts,
      tags,
      loading,
      search,
      setSearch,
      selectedTag,
      setSelectedTag,
      refresh,
      getContactById,
      addContact,
      updateContact,
      removeContact,
      removeContacts,
      addTagsToContacts,
      removeTagFromContacts,
      importContacts,
      saveContactBatch,
      mergeGroup,
      resetAll,
    }),
    [
      contacts,
      filteredContacts,
      tags,
      loading,
      search,
      selectedTag,
      refresh,
      getContactById,
      addContact,
      updateContact,
      removeContact,
      removeContacts,
      addTagsToContacts,
      removeTagFromContacts,
      importContacts,
      saveContactBatch,
      mergeGroup,
      resetAll,
    ],
  )

  return <ContactsContext.Provider value={value}>{children}</ContactsContext.Provider>
}

export function useContacts(): ContactsContextValue {
  const value = useContext(ContactsContext)
  if (!value) {
    throw new Error('useContacts must be used within ContactsProvider')
  }
  return value
}
