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

const LEGACY_DB_NAME = 'geo-contacts'
const LEGACY_CLAIM_KEY = 'geo-contacts-legacy-claimed-by'

function userDbName(userId: string): string {
  return `geo-contacts-u-${userId}`
}

export class GeoContactsDB extends Dexie {
  contacts!: Table<Contact, string>
  kinships!: Table<Kinship, string>

  constructor(name: string) {
    super(name)
    this.version(1).stores({
      contacts: 'id, name, updatedAt',
      kinships: 'id, fromId, toId, type, [fromId+type], [toId+type]',
    })
  }
}

class GeocodeCacheDB extends Dexie {
  geocodeCache!: Table<GeocodeCacheEntry, string>

  constructor() {
    super('geo-contacts-geocode')
    this.version(1).stores({
      geocodeCache: 'key, cachedAt',
    })
  }
}

const geocodeDb = new GeocodeCacheDB()

let activeDb: GeoContactsDB | null = null
let activeUserId: string | null = null

function requireDb(): GeoContactsDB {
  if (!activeDb || !activeUserId) {
    throw new Error('本地数据库尚未按用户打开')
  }
  return activeDb
}

/** 旧版单库 schema（含 geocodeCache），仅用于一次性迁移 */
class LegacyGeoContactsDB extends Dexie {
  contacts!: Table<Contact, string>
  geocodeCache!: Table<GeocodeCacheEntry, string>
  kinships!: Table<Kinship, string>

  constructor() {
    super(LEGACY_DB_NAME)
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

async function migrateLegacyIfNeeded(userId: string, target: GeoContactsDB): Promise<void> {
  const claimedBy = localStorage.getItem(LEGACY_CLAIM_KEY)
  if (claimedBy) return
  if (!(await Dexie.exists(LEGACY_DB_NAME))) return

  const legacy = new LegacyGeoContactsDB()
  try {
    await legacy.open()
    const [contacts, kinships, cache] = await Promise.all([
      legacy.contacts.toArray(),
      legacy.kinships.toArray().catch(() => [] as Kinship[]),
      legacy.geocodeCache.toArray().catch(() => [] as GeocodeCacheEntry[]),
    ])

    if (cache.length > 0) {
      await geocodeDb.geocodeCache.bulkPut(cache)
    }

    const existingCount = await target.contacts.count()
    if (existingCount === 0 && (contacts.length > 0 || kinships.length > 0)) {
      if (contacts.length > 0) await target.contacts.bulkPut(contacts)
      if (kinships.length > 0) await target.kinships.bulkPut(kinships)
    }

    localStorage.setItem(LEGACY_CLAIM_KEY, userId)
  } finally {
    legacy.close()
  }
}

/** 打开当前登录用户的本地库；可重复调用 */
export async function ensureUserDatabase(userId: string): Promise<void> {
  if (!userId) throw new Error('缺少用户 ID')
  if (activeUserId === userId && activeDb) return

  if (activeDb) {
    activeDb.close()
    activeDb = null
    activeUserId = null
  }

  const next = new GeoContactsDB(userDbName(userId))
  await next.open()
  await migrateLegacyIfNeeded(userId, next)
  activeDb = next
  activeUserId = userId
}

export function getActiveUserId(): string | null {
  return activeUserId
}

export async function closeUserDatabase(): Promise<void> {
  if (activeDb) {
    activeDb.close()
    activeDb = null
    activeUserId = null
  }
}

export async function getAllContacts(): Promise<Contact[]> {
  return requireDb().contacts.orderBy('name').toArray()
}

export async function getContact(id: string): Promise<Contact | undefined> {
  return requireDb().contacts.get(id)
}

export async function saveContact(contact: Contact): Promise<void> {
  await requireDb().contacts.put({ ...contact, updatedAt: Date.now() })
}

export async function saveContacts(contacts: Contact[]): Promise<void> {
  const now = Date.now()
  await requireDb().contacts.bulkPut(
    contacts.map((contact) => ({ ...contact, updatedAt: now })),
  )
}

export async function deleteKinshipsForContact(contactId: string): Promise<void> {
  const db = requireDb()
  await db.kinships
    .where('fromId')
    .equals(contactId)
    .or('toId')
    .equals(contactId)
    .delete()
}

export async function deleteContact(id: string): Promise<void> {
  const db = requireDb()
  await db.transaction('rw', db.contacts, db.kinships, async () => {
    await deleteKinshipsForContact(id)
    await db.contacts.delete(id)
  })
}

export async function deleteContacts(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  const db = requireDb()
  await db.transaction('rw', db.contacts, db.kinships, async () => {
    for (const id of ids) {
      await deleteKinshipsForContact(id)
    }
    await db.contacts.bulkDelete(ids)
  })
}

export async function clearAllContacts(): Promise<void> {
  const db = requireDb()
  await db.transaction('rw', db.contacts, db.kinships, async () => {
    await db.kinships.clear()
    await db.contacts.clear()
  })
}

export async function getAllKinships(): Promise<Kinship[]> {
  return requireDb().kinships.toArray()
}

export async function getKinshipsForContact(contactId: string): Promise<Kinship[]> {
  const db = requireDb()
  const asFrom = await db.kinships.where('fromId').equals(contactId).toArray()
  const asTo = await db.kinships.where('toId').equals(contactId).toArray()
  const map = new Map<string, Kinship>()
  for (const item of [...asFrom, ...asTo]) map.set(item.id, item)
  return [...map.values()]
}

export async function saveKinship(kinship: Kinship): Promise<void> {
  await requireDb().kinships.put(kinship)
}

export async function deleteKinship(id: string): Promise<void> {
  await requireDb().kinships.delete(id)
}

export async function clearAllKinships(): Promise<void> {
  await requireDb().kinships.clear()
}

export async function getGeocodeCache(
  key: string,
): Promise<GeocodeCacheEntry | undefined> {
  return geocodeDb.geocodeCache.get(key)
}

export async function setGeocodeCache(entry: GeocodeCacheEntry): Promise<void> {
  await geocodeDb.geocodeCache.put(entry)
}
