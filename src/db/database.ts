import Dexie, { type Table } from 'dexie'
import type { Contact } from '../types/contact'
import type { Kinship } from '../types/kinship'

export interface GeocodeCacheEntry {
  key: string
  latitude: number
  longitude: number
  displayName: string
  cachedAt: number
}

export class GeoContactsDB extends Dexie {
  contacts!: Table<Contact, string>
  geocodeCache!: Table<GeocodeCacheEntry, string>
  kinships!: Table<Kinship, string>

  constructor() {
    super('geo-contacts')
    this.version(1).stores({
      contacts: 'id, name, updatedAt',
      geocodeCache: 'key, cachedAt',
    })
    this.version(2).stores({
      contacts: 'id, name, updatedAt',
      geocodeCache: 'key, cachedAt',
      kinships: 'id, fromId, toId, type, [fromId+type], [toId+type]',
    })
  }
}

export const db = new GeoContactsDB()

export async function getAllContacts(): Promise<Contact[]> {
  return db.contacts.orderBy('name').toArray()
}

export async function getContact(id: string): Promise<Contact | undefined> {
  return db.contacts.get(id)
}

export async function saveContact(contact: Contact): Promise<void> {
  await db.contacts.put({ ...contact, updatedAt: Date.now() })
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  const now = Date.now()
  await db.contacts.bulkPut(
    contacts.map((contact) => ({ ...contact, updatedAt: now })),
  )
}

export async function deleteKinshipsForContact(contactId: string): Promise<void> {
  await db.kinships
    .where('fromId')
    .equals(contactId)
    .or('toId')
    .equals(contactId)
    .delete()
}

export async function deleteContact(id: string): Promise<void> {
  await db.transaction('rw', db.contacts, db.kinships, async () => {
    await deleteKinshipsForContact(id)
    await db.contacts.delete(id)
  })
}

export async function deleteContacts(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db.transaction('rw', db.contacts, db.kinships, async () => {
    for (const id of ids) {
      await deleteKinshipsForContact(id)
    }
    await db.contacts.bulkDelete(ids)
  })
}

export async function clearAllContacts(): Promise<void> {
  await db.transaction('rw', db.contacts, db.kinships, async () => {
    await db.kinships.clear()
    await db.contacts.clear()
  })
}

export async function getAllKinships(): Promise<Kinship[]> {
  return db.kinships.toArray()
}

export async function getKinshipsForContact(contactId: string): Promise<Kinship[]> {
  const asFrom = await db.kinships.where('fromId').equals(contactId).toArray()
  const asTo = await db.kinships.where('toId').equals(contactId).toArray()
  const map = new Map<string, Kinship>()
  for (const item of [...asFrom, ...asTo]) map.set(item.id, item)
  return [...map.values()]
}

export async function saveKinship(kinship: Kinship): Promise<void> {
  await db.kinships.put(kinship)
}

export async function deleteKinship(id: string): Promise<void> {
  await db.kinships.delete(id)
}

export async function clearAllKinships(): Promise<void> {
  await db.kinships.clear()
}

export async function getGeocodeCache(
  key: string,
): Promise<GeocodeCacheEntry | undefined> {
  return db.geocodeCache.get(key)
}

export async function setGeocodeCache(entry: GeocodeCacheEntry): Promise<void> {
  await db.geocodeCache.put(entry)
}
