import {
  getAllContacts,
  getAllKinships,
  saveContacts,
  saveKinship,
} from '../db/database'
import {
  createSampleContacts,
  createSampleFamilyContacts,
  createSampleKinships,
  getSampleProfileAvatar,
  SAMPLE_PROFILE,
} from '../data/sample-contacts'
import { getSampleContactAvatar } from './demo-avatar'
import { api } from './api'

const seededKey = (userId: string) => `geo-contacts-demo-seeded:${userId}`
const avatarBackfillKey = (userId: string) => `geo-contacts-demo-avatars:${userId}`
const avatarGenderBackfillKey = (userId: string) => `geo-contacts-demo-avatar-gender:v1:${userId}`
const kinshipBackfillKey = (userId: string) => `geo-contacts-demo-kinships:${userId}`
const hintKey = 'geo-contacts-show-demo-hint'

export function shouldShowDemoHint(): boolean {
  return sessionStorage.getItem(hintKey) === '1'
}

export function dismissDemoHint(): void {
  sessionStorage.removeItem(hintKey)
}

async function seedDemoProfile(displayName?: string): Promise<void> {
  try {
    await api.updateProfile({
      bio: SAMPLE_PROFILE.bio,
      avatar: getSampleProfileAvatar(displayName ?? 'GeoContacts'),
      hometown: SAMPLE_PROFILE.hometown,
      birthplace: SAMPLE_PROFILE.birthplace,
      currentLocation: SAMPLE_PROFILE.currentLocation,
    })
  } catch {
    // 资料填充失败不影响示例联系人导入
  }
}

async function saveSampleKinships(contacts: Awaited<ReturnType<typeof getAllContacts>>) {
  const kinships = createSampleKinships(contacts)
  for (const kinship of kinships) {
    await saveKinship(kinship)
  }
  return kinships.length
}

/** 给已有示例联系人补上头像（老用户本地已导入过无头像数据时） */
export async function backfillSampleAvatars(userId: string): Promise<number> {
  if (localStorage.getItem(avatarBackfillKey(userId))) {
    return 0
  }

  const contacts = await getAllContacts()
  const needUpdate = contacts.filter(
    (contact) =>
      !contact.avatar &&
      (contact.source === '示例数据' || contact.tags.includes('示例')),
  )

  if (needUpdate.length === 0) {
    localStorage.setItem(avatarBackfillKey(userId), '1')
    return 0
  }

  await saveContacts(
    needUpdate.map((contact) => ({
      ...contact,
      avatar: getSampleContactAvatar(contact.name),
    })),
  )

  localStorage.setItem(avatarBackfillKey(userId), '1')
  window.dispatchEvent(new Event('geo-contacts-updated'))
  return needUpdate.length
}

/** 按姓名性别重写示例头像（修正 DiceBear 随机性别错位） */
export async function backfillSampleAvatarGender(userId: string): Promise<number> {
  if (localStorage.getItem(avatarGenderBackfillKey(userId))) {
    return 0
  }

  const contacts = await getAllContacts()
  const samples = contacts.filter(
    (contact) => contact.source === '示例数据' || contact.tags.includes('示例'),
  )

  if (samples.length === 0) {
    localStorage.setItem(avatarGenderBackfillKey(userId), '1')
    return 0
  }

  const patched = samples.map((contact) => ({
    ...contact,
    avatar: getSampleContactAvatar(contact.name),
  }))

  await saveContacts(patched)
  localStorage.setItem(avatarGenderBackfillKey(userId), '1')
  localStorage.setItem(avatarBackfillKey(userId), '1')
  window.dispatchEvent(new Event('geo-contacts-updated'))
  return patched.length
}

/**
 * 为已导入示例数据的用户补齐族谱成员与关系。
 * - 缺成员则追加 createSampleFamilyContacts
 * - 已有同名「王浩然」等则按姓名挂关系
 */
export async function backfillSampleKinships(userId: string): Promise<number> {
  if (localStorage.getItem(kinshipBackfillKey(userId))) {
    return 0
  }

  const existing = await getAllContacts()
  if (existing.length === 0) {
    localStorage.setItem(kinshipBackfillKey(userId), '1')
    return 0
  }

  const existingKinships = await getAllKinships()
  const family = createSampleFamilyContacts()
  const byName = new Map(existing.map((c) => [c.name, c]))

  const toAdd = family.filter((member) => {
    if (existing.some((c) => c.id === member.id)) return false
    // 老示例里的「王浩然」保留原 id，不重复插入
    if (byName.has(member.name)) return false
    return true
  })

  // 老数据「王浩然」：清空籍贯以展示推断（仅当仍是示例且无 notes 未改写意图）
  const legacyHaoran = byName.get('王浩然')
  const patches: typeof existing = []
  if (
    legacyHaoran &&
    legacyHaoran.source === '示例数据' &&
    legacyHaoran.hometown &&
    !existing.some((c) => c.id === family.find((f) => f.name === '王浩然')?.id)
  ) {
    patches.push({
      ...legacyHaoran,
      hometown: undefined,
      notes: legacyHaoran.notes?.includes('推断')
        ? legacyHaoran.notes
        : `${legacyHaoran.notes ?? ''}；籍贯留空可演示族谱推断`.replace(/^；/, ''),
      tags: [...new Set([...legacyHaoran.tags, '家人'])],
    })
  }

  if (toAdd.length > 0 || patches.length > 0) {
    await saveContacts([...toAdd, ...patches])
  }

  const merged = await getAllContacts()
  const desired = createSampleKinships(merged)
  const existingKeys = new Set(
    existingKinships.map((k) => `${k.type}:${k.fromId}:${k.toId}:${k.role ?? ''}`),
  )
  let added = 0
  for (const kinship of desired) {
    const key = `${kinship.type}:${kinship.fromId}:${kinship.toId}:${kinship.role ?? ''}`
    if (existingKeys.has(key)) continue
    await saveKinship(kinship)
    existingKeys.add(key)
    added += 1
  }

  localStorage.setItem(kinshipBackfillKey(userId), '1')
  if (toAdd.length > 0 || patches.length > 0 || added > 0) {
    window.dispatchEvent(new Event('geo-contacts-updated'))
  }
  return added + toAdd.length
}

export async function seedDemoDataIfNeeded(
  userId: string,
  displayName?: string,
): Promise<number> {
  await backfillSampleAvatars(userId)
  await backfillSampleAvatarGender(userId)
  await backfillSampleKinships(userId)

  if (localStorage.getItem(seededKey(userId))) {
    return 0
  }

  const existing = await getAllContacts()
  if (existing.length > 0) {
    localStorage.setItem(seededKey(userId), '1')
    localStorage.setItem(kinshipBackfillKey(userId), '1')
    return 0
  }

  const samples = createSampleContacts()
  await saveContacts(samples)
  await saveSampleKinships(samples)
  await seedDemoProfile(displayName)
  localStorage.setItem(avatarBackfillKey(userId), '1')
  localStorage.setItem(avatarGenderBackfillKey(userId), '1')
  localStorage.setItem(kinshipBackfillKey(userId), '1')

  localStorage.setItem(seededKey(userId), '1')
  sessionStorage.setItem(hintKey, '1')
  window.dispatchEvent(new Event('geo-contacts-updated'))
  return samples.length
}

export async function forceSeedDemoData(
  userId: string,
  displayName?: string,
): Promise<number> {
  const samples = createSampleContacts()
  await saveContacts(samples)
  await saveSampleKinships(samples)
  await seedDemoProfile(displayName)
  localStorage.setItem(seededKey(userId), '1')
  localStorage.setItem(avatarBackfillKey(userId), '1')
  localStorage.setItem(avatarGenderBackfillKey(userId), '1')
  localStorage.setItem(kinshipBackfillKey(userId), '1')
  sessionStorage.setItem(hintKey, '1')
  window.dispatchEvent(new Event('geo-contacts-updated'))
  return samples.length
}
