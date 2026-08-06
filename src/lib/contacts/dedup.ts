import type { Contact, DuplicateGroup } from '../types/contact'
import {
  normalizeEmail,
  normalizeName,
  normalizePhone,
  phonesMatch,
} from './normalize'

interface ContactIndex {
  contact: Contact
  phoneKeys: Set<string>
  emailKeys: Set<string>
  nameKey: string
}

function buildIndex(contact: Contact): ContactIndex {
  return {
    contact,
    phoneKeys: new Set(contact.phones.map(normalizePhone).filter(Boolean)),
    emailKeys: new Set(contact.emails.map(normalizeEmail).filter(Boolean)),
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

function sharePhone(a: ContactIndex, b: ContactIndex): boolean {
  for (const phone of a.phoneKeys) {
    for (const other of b.phoneKeys) {
      if (phonesMatch(phone, other)) return true
    }
  }
  return false
}

function shareEmail(a: ContactIndex, b: ContactIndex): boolean {
  for (const email of a.emailKeys) {
    if (b.emailKeys.has(email)) return true
  }
  return false
}

function similarName(a: ContactIndex, b: ContactIndex): boolean {
  if (!a.nameKey || !b.nameKey) return false
  if (a.nameKey === b.nameKey) return true
  if (a.nameKey.length >= 2 && b.nameKey.length >= 2) {
    return a.nameKey.includes(b.nameKey) || b.nameKey.includes(a.nameKey)
  }
  return false
}

export function findDuplicateGroups(contacts: Contact[]): DuplicateGroup[] {
  const indexes = contacts.map(buildIndex)
  const uf = new UnionFind()

  for (let i = 0; i < indexes.length; i++) {
    for (let j = i + 1; j < indexes.length; j++) {
      const left = indexes[i]
      const right = indexes[j]

      const isDuplicate =
        sharePhone(left, right) ||
        shareEmail(left, right) ||
        (similarName(left, right) &&
          (left.phoneKeys.size > 0 || left.emailKeys.size > 0))

      if (isDuplicate) {
        uf.union(left.contact.id, right.contact.id)
      }
    }
  }

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
