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
} from '@/db/database'
import { findDuplicateGroups, mergeContacts } from '@/lib/dedup'
import type { Contact, DuplicateGroup } from '@/types/contact'

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

export interface ContactsContextValue {
  contacts: Contact[]
  filteredContacts: Contact[]
  duplicateGroups: DuplicateGroup[]
  tags: string[]
  loading: boolean
  search: string
  setSearch: (value: string) => void
  selectedTag: string | null
  setSelectedTag: (tag: string | null) => void
  refresh: () => Promise<void>
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
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getAllContacts()
      setContacts(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onUpdated = () => {
      void refresh()
    }
    window.addEventListener('geo-contacts-updated', onUpdated)
    return () => window.removeEventListener('geo-contacts-updated', onUpdated)
  }, [refresh])

  const duplicateGroups = useMemo(
    () => findDuplicateGroups(contacts),
    [contacts],
  )

  const tags = useMemo(() => {
    const all = contacts.flatMap((contact) => contact.tags)
    return [...new Set(all)].sort()
  }, [contacts])

  const filteredContacts = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return contacts.filter((contact) => {
      if (selectedTag && !contact.tags.includes(selectedTag)) return false
      if (!keyword) return true

      const haystack = [
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
        .toLowerCase()

      return haystack.includes(keyword)
    })
  }, [contacts, search, selectedTag])

  const getContactById = useCallback(async (id: string) => {
    const cached = contacts.find((contact) => contact.id === id)
    if (cached) return cached
    return getContact(id)
  }, [contacts])

  const addContact = useCallback(async (contact: Contact) => {
    await saveContact(contact)
    await refresh()
  }, [refresh])

  const updateContact = useCallback(async (contact: Contact) => {
    await saveContact(contact)
    await refresh()
  }, [refresh])

  const removeContact = useCallback(async (id: string) => {
    await deleteContact(id)
    window.dispatchEvent(new Event('geo-contacts-updated'))
    await refresh()
  }, [refresh])

  const removeContacts = useCallback(async (ids: string[]) => {
    await deleteContacts(ids)
    window.dispatchEvent(new Event('geo-contacts-updated'))
    await refresh()
  }, [refresh])

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
    await refresh()
  }, [contacts, refresh])

  const removeTagFromContacts = useCallback(async (ids: string[], tag: string) => {
    const target = tag.trim()
    if (ids.length === 0 || !target) return

    const idSet = new Set(ids)
    const updated = contacts
      .filter((contact) => idSet.has(contact.id))
      .map((contact) => ({
        ...contact,
        tags: contact.tags.filter((item) => item !== target),
      }))

    await saveContacts(updated)
    await refresh()
  }, [contacts, refresh])

  const importContacts = useCallback(async (incoming: Contact[]) => {
    await saveContacts(incoming)
    await refresh()
  }, [refresh])

  const saveContactBatch = useCallback(async (next: Contact[]) => {
    await saveContacts(next)
    await refresh()
  }, [refresh])

  const mergeGroup = useCallback(async (group: DuplicateGroup) => {
    const selected = contacts.filter((contact) => group.contactIds.includes(contact.id))
    if (selected.length < 2) return

    const merged = mergeContacts(selected)
    const removeIds = selected.map((contact) => contact.id).filter((id) => id !== merged.id)

    await saveContact(merged)
    await deleteContacts(removeIds)
    window.dispatchEvent(new Event('geo-contacts-updated'))
    await refresh()
  }, [contacts, refresh])

  const resetAll = useCallback(async () => {
    await clearAllContacts()
    window.dispatchEvent(new Event('geo-contacts-updated'))
    await refresh()
  }, [refresh])

  const value = useMemo<ContactsContextValue>(
    () => ({
      contacts,
      filteredContacts,
      duplicateGroups,
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
      duplicateGroups,
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
