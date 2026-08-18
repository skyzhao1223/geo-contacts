import { describe, expect, it } from 'vitest'
import { findDuplicateGroups, mergeContacts } from './dedup'
import type { Contact } from '../../types/contact'

function contact(partial: Partial<Contact> & Pick<Contact, 'id' | 'name'>): Contact {
  return {
    phones: [],
    emails: [],
    tags: [],
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  }
}

describe('findDuplicateGroups', () => {
  it('groups contacts sharing the same phone', () => {
    const contacts = [
      contact({ id: 'a', name: '张三', phones: ['13800138000'] }),
      contact({ id: 'b', name: '李四', phones: ['13800138000'] }),
      contact({ id: 'c', name: '王五', phones: ['13900139000'] }),
    ]

    const groups = findDuplicateGroups(contacts)
    expect(groups).toHaveLength(1)
    expect(groups[0].contactIds.sort()).toEqual(['a', 'b'])
  })

  it('groups contacts sharing email', () => {
    const contacts = [
      contact({ id: 'a', name: 'A', emails: ['a@example.com'] }),
      contact({ id: 'b', name: 'B', emails: ['a@example.com'] }),
    ]
    const groups = findDuplicateGroups(contacts)
    expect(groups).toHaveLength(1)
    expect(groups[0].contactIds.sort()).toEqual(['a', 'b'])
  })

  it('groups similar names when contact keys exist', () => {
    const contacts = [
      contact({ id: 'a', name: '张伟', phones: ['13800000001'] }),
      contact({ id: 'b', name: '张伟明', phones: ['13900000002'] }),
      contact({ id: 'c', name: '李明' }),
    ]
    const groups = findDuplicateGroups(contacts)
    expect(groups).toHaveLength(1)
    expect(groups[0].contactIds.sort()).toEqual(['a', 'b'])
  })

  it('does not mark unrelated contacts as duplicates', () => {
    const contacts = [
      contact({ id: 'a', name: 'Alice', phones: ['111'] }),
      contact({ id: 'b', name: 'Bob', phones: ['222'] }),
    ]
    expect(findDuplicateGroups(contacts)).toEqual([])
  })
})

describe('mergeContacts', () => {
  it('keeps newest base and merges phones/emails/tags', () => {
    const merged = mergeContacts([
      contact({
        id: 'old',
        name: 'Old',
        phones: ['111'],
        emails: ['a@x.com'],
        tags: ['朋友'],
        updatedAt: 1,
      }),
      contact({
        id: 'new',
        name: 'New',
        phones: ['222'],
        emails: ['b@x.com'],
        tags: ['同事'],
        updatedAt: 2,
      }),
    ])

    expect(merged.id).toBe('new')
    expect(merged.name).toBe('New')
    expect(merged.phones.sort()).toEqual(['111', '222'])
    expect(merged.emails.sort()).toEqual(['a@x.com', 'b@x.com'])
    expect(merged.tags.sort()).toEqual(['同事', '朋友'])
  })
})
