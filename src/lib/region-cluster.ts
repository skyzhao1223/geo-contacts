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

function normalizePart(value?: string): string | undefined {
  const trimmed = value?.trim()
  return trimmed || undefined
}

/** 根据缩放级别决定聚合粒度 */
export function regionLevelForZoom(zoom: number): RegionLevel {
  if (zoom < 4) return 'country'
  if (zoom < 7) return 'province'
  if (zoom < 11) return 'city'
  return 'person'
}

/**
 * 生成地区聚合键与标题。
 * 缺省字段时向上回退（无市则用省，无省则用国家）。
 */
export function resolveRegionKey(
  location: Location,
  level: RegionLevel,
): { key: string; title: string } {
  const country = normalizePart(location.country) ?? '未知地区'
  const province = normalizePart(location.province)
  const city = normalizePart(location.city)

  if (level === 'country') {
    return { key: `country:${country}`, title: country }
  }

  if (level === 'province') {
    if (province) {
      return {
        key: `province:${country}|${province}`,
        title: country === '中国' || country === 'China' ? province : `${province}, ${country}`,
      }
    }
    if (city) {
      return {
        key: `city:${country}|${city}`,
        title: country === '中国' || country === 'China' ? city : `${city}, ${country}`,
      }
    }
    return { key: `country:${country}`, title: country }
  }

  if (level === 'city') {
    if (city) {
      const title =
        province && (country === '中国' || country === 'China')
          ? `${city}`
          : [city, province, country].filter(Boolean).join(', ')
      return {
        key: `city:${country}|${province ?? ''}|${city}`,
        title,
      }
    }
    if (province) {
      return {
        key: `province:${country}|${province}`,
        title: country === '中国' || country === 'China' ? province : `${province}, ${country}`,
      }
    }
    return { key: `country:${country}`, title: country }
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

/** 按当前缩放对应的地区级别聚合标记点 */
export function clusterByRegion(
  points: RegionPoint[],
  zoom: number,
): { clusters: RegionCluster[]; singles: RegionPoint[] } {
  const level = regionLevelForZoom(zoom)

  if (level === 'person' || points.length === 0) {
    return { clusters: [], singles: points }
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
  const singles: RegionPoint[] = []

  for (const [key, members] of groups) {
    if (members.length === 1) {
      singles.push(members[0])
      continue
    }

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

  return { clusters, singles }
}

/** 点击地区聚合后建议的目标缩放 */
export function zoomAfterRegionExpand(level: RegionLevel, currentZoom: number): number {
  if (level === 'country') return Math.max(currentZoom + 1, 4.5)
  if (level === 'province') return Math.max(currentZoom + 1, 7.5)
  return Math.max(currentZoom + 1, 11.5)
}
