import type { Location } from '../types/contact'

export type RegionLevel = 'country' | 'province' | 'city' | 'person'

export interface RegionPoint {
  id: string
  name: string
  position: [number, number]
  location: Location
  avatar?: string
  label: string
  tags: string[]
  online?: boolean | null
}

export interface RegionCluster {
  key: string
  level: RegionLevel
  /** 聚合显示名：国家 / 省 / 市 */
  title: string
  count: number
  position: [number, number]
  bounds: [number, number][]
  members: RegionPoint[]
}

/** 比例尺 → 聚合维度（闭开区间，保证同级维度唯一） */
export const REGION_ZOOM_BANDS: ReadonlyArray<{
  level: RegionLevel
  minZoom: number
  maxZoom: number
  label: string
}> = [
  { level: 'country', minZoom: 2, maxZoom: 4, label: '按国家聚合' },
  { level: 'province', minZoom: 4, maxZoom: 7, label: '按省/州聚合' },
  { level: 'city', minZoom: 7, maxZoom: 11, label: '按城市聚合' },
  { level: 'person', minZoom: 11, maxZoom: 19, label: '显示个人' },
]

function normalizePart(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

function isChina(country: string): boolean {
  return country === '中国' || country === 'China'
}

/** 省/州槽位：缺省时用城市填槽，仍属同一「省/州」维度，不降级到国家或升级到城市键 */
function admin1Slot(location: Location): string {
  return (
    normalizePart(location.province) ??
    normalizePart(location.city) ??
    '未标注省/州'
  )
}

/** 城市槽位：缺省时用区或占位，仍属同一「城市」维度 */
function admin2Slot(location: Location): string {
  return (
    normalizePart(location.city) ??
    normalizePart(location.district) ??
    '未标注城市'
  )
}

function countrySlot(location: Location): string {
  return normalizePart(location.country) ?? '未知地区'
}

/** 根据缩放级别决定聚合粒度 */
export function regionLevelForZoom(zoom: number): RegionLevel {
  for (const band of REGION_ZOOM_BANDS) {
    if (zoom >= band.minZoom && zoom < band.maxZoom) {
      return band.level
    }
  }
  return 'person'
}

export function regionLevelLabel(level: RegionLevel): string {
  return REGION_ZOOM_BANDS.find((band) => band.level === level)?.label ?? level
}

/**
 * 生成地区聚合键与标题。
 * 同一 level 下键前缀固定，禁止跨维度回退（country/province/city 不混用）。
 */
export function resolveRegionKey(
  location: Location,
  level: RegionLevel,
): { key: string; title: string } {
  const country = countrySlot(location)

  if (level === 'country') {
    return { key: `country:${country}`, title: country }
  }

  if (level === 'province') {
    const province = admin1Slot(location)
    return {
      key: `province:${country}|${province}`,
      title: isChina(country) ? province : `${province}, ${country}`,
    }
  }

  if (level === 'city') {
    const province = admin1Slot(location)
    const city = admin2Slot(location)
    const title = isChina(country)
      ? city
      : [city, province !== city ? province : undefined, country]
          .filter(Boolean)
          .join(', ')
    return {
      key: `city:${country}|${province}|${city}`,
      title,
    }
  }

  return { key: `person`, title: '' }
}

function averagePosition(points: RegionPoint[]): [number, number] {
  const lat =
    points.reduce((sum, point) => sum + point.position[0], 0) / points.length
  const lng =
    points.reduce((sum, point) => sum + point.position[1], 0) / points.length
  return [lat, lng]
}

/** 进入下一聚合维度所需的最小缩放 */
export function nextRegionZoom(level: RegionLevel): number {
  if (level === 'country') return 4
  if (level === 'province') return 7
  if (level === 'city') return 11
  return 12
}

/**
 * 按当前缩放对应的地区级别聚合。
 * country/province/city 级一律输出地区气泡（含 1 人），不与个人头像混显，保证同比例尺维度一致。
 */
export function clusterByRegion(
  points: RegionPoint[],
  zoom: number,
): { clusters: RegionCluster[]; singles: RegionPoint[]; level: RegionLevel } {
  const level = regionLevelForZoom(zoom)

  if (level === 'person' || points.length === 0) {
    return { clusters: [], singles: points, level }
  }

  const groups = new Map<string, RegionPoint[]>()
  const titles = new Map<string, string>()

  for (const point of points) {
    const { key, title } = resolveRegionKey(point.location, level)
    const list = groups.get(key) ?? []
    list.push(point)
    groups.set(key, list)
    titles.set(key, title)
  }

  const clusters: RegionCluster[] = []

  for (const [key, members] of groups) {
    clusters.push({
      key,
      level,
      title: titles.get(key) ?? key,
      count: members.length,
      position: averagePosition(members),
      bounds: members.map((member) => member.position),
      members,
    })
  }

  clusters.sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh'))

  return { clusters, singles: [], level }
}

/** 点击地区聚合后进入下一维度的目标缩放 */
export function zoomAfterRegionExpand(level: RegionLevel, _currentZoom: number): number {
  return nextRegionZoom(level)
}
