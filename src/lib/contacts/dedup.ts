import type { Contact, DuplicateGroup } from '../../types/contact'
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  phonesMatch,
} from './normalize'

interface ContactIndex {
  contact: Contact
  phoneKeys: string[]
  emailKeys: string[]
  nameKey: string
}

function buildIndex(contact: Contact): ContactIndex {
  return {
    contact,
    phoneKeys: contact.phones.map(normalizePhone).filter(Boolean),
    emailKeys: contact.emails.map(normalizeEmail).filter(Boolean),
    nameKey: normalizeName(contact.name),
  }
}

class UnionFind {
  private parent = new Map<string, string>()

  find(id: string): string {
    const parent = this.parent.get(id)
    if (!parent || parent === id) {
      this.parent.set(id, id)
      return id
    }
    const root = this.find(parent)
    this.parent.set(id, root)
    return root
  }

  union(a: string, b: string): void {
    const rootA = this.find(a)
    const rootB = this.find(b)
    if (rootA !== rootB) {
      this.parent.set(rootB, rootA)
    }
  }
}

function phoneLookupKeys(phone: string): string[] {
  if (!phone) return []
  const keys = [phone]
  if (phone.length >= 8) keys.push(`suf:${phone.slice(-8)}`)
  return keys
}

function addToIndex(map: Map<string, number[]>, key: string, index: number): void {
  const list = map.get(key)
  if (list) list.push(index)
  else map.set(key, [index])
}

function sharePhone(a: ContactIndex, b: ContactIndex): boolean {
  for (const phone of a.phoneKeys) {
    for (const other of b.phoneKeys) {
      if (phonesMatch(phone, other)) return true
    }
  }
  return false
}

function shareEmail(a: ContactIndex, b: ContactIndex): boolean {
  const right = new Set(b.emailKeys)
  return a.emailKeys.some((email) => right.has(email))
}

function similarName(a: ContactIndex, b: ContactIndex): boolean {
  if (!a.nameKey || !b.nameKey) return false
  if (a.nameKey === b.nameKey) return true
  if (a.nameKey.length >= 2 && b.nameKey.length >= 2) {
    return a.nameKey.includes(b.nameKey) || b.nameKey.includes(a.nameKey)
  }
  return false
}

function hasContactKeys(index: ContactIndex): boolean {
  return index.phoneKeys.length > 0 || index.emailKeys.length > 0
}

/**
 * 通过 phone / email / name 倒排索引收集候选对，再精确比对。
 * 避免全量 O(n²) 两两比较。
 */
export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const indexes = contacts.map(buildIndex)
  const uf = new UnionFind()

  const phoneIndex = new Map<string, number[]>()
  const emailIndex = new Map<string, number[]>()
  const nameIndex = new Map<string, number[]>()
  const namePrefixIndex = new Map<string, number[]>()

  indexes.forEach((item, i) => {
    for (const phone of item.phoneKeys) {
      for (const key of phoneLookupKeys(phone)) {
        addToIndex(phoneIndex, key, i)
      }
    }
    for (const email of item.emailKeys) {
      addToIndex(emailIndex, email, i)
    }
    if (item.nameKey) {
      addToIndex(nameIndex, item.nameKey, i)
      const prefix = item.nameKey.slice(0, 2)
      if (prefix) addToIndex(namePrefixIndex, prefix, i)
    }
  })

  const seenPairs = new Set<string>()

  const considerPair = (i: number, j: number) => {
    if (i === j) return
    const a = Math.min(i, j)
    const b = Math.max(i, j)
    const key = `${a}:${b}`
    if (seenPairs.has(key)) return
    seenPairs.add(key)

    const left = indexes[a]
    const right = indexes[b]
    const isDuplicate =
      sharePhone(left, right) ||
      shareEmail(left, right) ||
      (similarName(left, right) && hasContactKeys(left))

    if (isDuplicate) {
      uf.union(left.contact.id, right.contact.id)
    }
  }

  const scanBuckets = (map: Map<string, number[]>) => {
    for (const bucket of map.values()) {
      if (bucket.length < 2) continue
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          considerPair(bucket[i], bucket[j])
        }
      }
    }
  }

  scanBuckets(phoneIndex)
  scanBuckets(emailIndex)
  scanBuckets(nameIndex)
  scanBuckets(namePrefixIndex)

  const groups = new Map<string, string[]>()
  for (const contact of contacts) {
    const root = uf.find(contact.id)
    const list = groups.get(root) ?? []
    list.push(contact.id)
    groups.set(root, list)
  }

  return [...groups.values()]
    .filter((ids) => ids.length > 1)
    .map((contactIds) => ({
      id: contactIds.sort().join('-'),
      contactIds,
      reason: '检测到可能重复的联系人',
      score: contactIds.length,
    }))
}

export function mergeContacts(contacts: Contact[]): Contact {
  const sorted = [...contacts].sort((a, b) => b.updatedAt - a.updatedAt)
  const base = sorted[0]

  const mergeUnique = (values: string[]) => [...new Set(values.filter(Boolean))]

  return {
    ...base,
    id: base.id,
    name: sorted.find((c) => c.name.trim())?.name ?? base.name,
    phones: mergeUnique(contacts.flatMap((c) => c.phones)),
    emails: mergeUnique(contacts.flatMap((c) => c.emails)),
    tags: mergeUnique(contacts.flatMap((c) => c.tags)),
    company: sorted.find((c) => c.company)?.company ?? base.company,
    title: sorted.find((c) => c.title)?.title ?? base.title,
    birthday: sorted.find((c) => c.birthday)?.birthday ?? base.birthday,
    notes: contacts
      .map((c) => c.notes)
      .filter(Boolean)
      .join('\n---\n'),
    birthplace: sorted.find((c) => c.birthplace)?.birthplace ?? base.birthplace,
    hometown: sorted.find((c) => c.hometown)?.hometown ?? base.hometown,
    currentLocation:
      sorted.find((c) => c.currentLocation)?.currentLocation ?? base.currentLocation,
    linkedUserId: sorted.find((c) => c.linkedUserId)?.linkedUserId ?? base.linkedUserId,
    source: mergeUnique(contacts.map((c) => c.source ?? '').filter(Boolean)).join(', '),
    updatedAt: Date.now(),
  }
}
