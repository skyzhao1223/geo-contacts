import { getAllContacts, getAllKinships, saveContacts } from '@/local-db/database'
import { listKinshipContactIds } from './family-tree'

/** 系统标签：有族谱关系（父母/配偶）的联系人自动打上 */
export const SYSTEM_FAMILY_TAG = '族谱'

/** 旧版示例/手写标签，同步时迁移为 SYSTEM_FAMILY_TAG */
const LEGACY_FAMILY_TAGS = new Set(['家人'])

let syncInFlight: Promise<number> | null = null

export function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

function normalizeFamilyTags(tags: string[], inFamily: boolean): string[] {
  const cleaned = tags.filter(
    (tag) => tag !== SYSTEM_FAMILY_TAG && !LEGACY_FAMILY_TAGS.has(tag),
  )
  if (inFamily) {
    return uniqueTags([SYSTEM_FAMILY_TAG, ...cleaned])
  }
  return uniqueTags(cleaned)
}

/**
 * 按当前 kinships 给联系人打上/摘掉「族谱」系统标签。
 * 不广播事件——由调用方决定是否 notifyContactsUpdated。
 * 并发调用会合并为同一次同步。
 */
export async function syncFamilySystemTags(): Promise<number> {
  if (syncInFlight) return syncInFlight

  syncInFlight = (async () => {
    const [contacts, kinships] = await Promise.all([getAllContacts(), getAllKinships()])
    const inFamily = listKinshipContactIds(kinships)
    const now = Date.now()

    const updated = contacts.flatMap((contact) => {
      const nextTags = normalizeFamilyTags(contact.tags, inFamily.has(contact.id))
      const same =
        nextTags.length === contact.tags.length &&
        nextTags.every((tag, index) => tag === contact.tags[index])
      if (same) return []
      return [{ ...contact, tags: nextTags, updatedAt: now }]
    })

    if (updated.length > 0) {
      await saveContacts(updated)
    }

    return updated.length
  })()

  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
  }
}

/** 标签列表排序：系统标签靠前 */
export function sortTagsForDisplay(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    if (a === SYSTEM_FAMILY_TAG && b !== SYSTEM_FAMILY_TAG) return -1
    if (b === SYSTEM_FAMILY_TAG && a !== SYSTEM_FAMILY_TAG) return 1
    return a.localeCompare(b, 'zh')
  })
}
