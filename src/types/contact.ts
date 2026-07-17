export interface Location {
  /** 国家 / 地区，如 China、日本、United States */
  country?: string
  /** 省 / 州 / 大区 */
  province?: string
  city?: string
  district?: string
  address?: string
  latitude?: number
  longitude?: number
  geocodedAt?: number
}

export interface Contact {
  id: string
  name: string
  phones: string[]
  emails: string[]
  company?: string
  title?: string
  birthday?: string
  birthplace?: Location
  hometown?: Location
  currentLocation?: Location
  tags: string[]
  notes?: string
  avatar?: string
  linkedUserId?: string
  source?: string
  createdAt: number
  updatedAt: number
}

export type LocationField = 'birthplace' | 'hometown' | 'currentLocation'

export const LOCATION_FIELD_LABELS: Record<LocationField, string> = {
  birthplace: '出生地',
  hometown: '籍贯',
  currentLocation: '现居地',
}

export interface DuplicateGroup {
  id: string
  contactIds: string[]
  reason: string
  score: number
}

export interface CsvColumnMapping {
  name?: string
  phone?: string
  email?: string
  company?: string
  birthplace?: string
  hometown?: string
  currentLocation?: string
  tags?: string
  notes?: string
}

export function createEmptyContact(partial?: Partial<Contact>): Contact {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    name: '',
    phones: [],
    emails: [],
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function locationToText(location?: Location): string {
  if (!location) return ''
  // 城市在前、国家在后，兼顾「Tokyo, Japan」与「杭州, 浙江」
  return [
    location.address,
    location.district,
    location.city,
    location.province,
    location.country,
  ]
    .filter(Boolean)
    .join(', ')
}

/**
 * 解析地址文本。支持：
 * - 国际写法：`Tokyo, Japan` / `Seattle, WA, USA`
 * - 中文空格写法：`浙江 杭州 西湖区`
 * - 自由文本：单段内容按城市名处理，交给地理编码
 */
export function parseLocationText(text: string): Location {
  const trimmed = text.trim()
  if (!trimmed) return {}

  if (/[,，]/.test(trimmed)) {
    const parts = trimmed.split(/[,，]+/).map((part) => part.trim()).filter(Boolean)
    if (parts.length === 1) return { city: parts[0] }
    if (parts.length === 2) {
      return { city: parts[0], country: parts[1] }
    }
    if (parts.length === 3) {
      return { city: parts[0], province: parts[1], country: parts[2] }
    }
    return {
      address: parts.slice(0, -3).join(', ') || undefined,
      city: parts[parts.length - 3],
      province: parts[parts.length - 2],
      country: parts[parts.length - 1],
    }
  }

  const parts = trimmed.split(/[\s、]+/).filter(Boolean)
  if (parts.length === 1) {
    return { city: parts[0] }
  }
  return {
    province: parts[0],
    city: parts[1],
    district: parts[2],
    address: parts.slice(3).join(' ') || undefined,
  }
}

export function getContactLocation(
  contact: Contact,
  field: LocationField,
): Location | undefined {
  return contact[field]
}
