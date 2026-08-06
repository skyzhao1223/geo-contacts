import type { Location } from '../types/contact'
import { locationToText } from '../types/contact'
import { getGeocodeCache, setGeocodeCache } from '../db/database'

export type MapProvider = 'osm' | 'amap'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
let lastRequestAt = 0

/** 常见国家名 → ISO 3166-1 alpha-2，用于缩小检索范围（可选） */
const COUNTRY_CODES: Record<string, string> = {
  china: 'cn',
  中国: 'cn',
  中华人民共和国: 'cn',
  japan: 'jp',
  日本: 'jp',
  'united states': 'us',
  usa: 'us',
  us: 'us',
  america: 'us',
  美国: 'us',
  'united kingdom': 'gb',
  uk: 'gb',
  britain: 'gb',
  英国: 'gb',
  france: 'fr',
  法国: 'fr',
  germany: 'de',
  德国: 'de',
  canada: 'ca',
  加拿大: 'ca',
  australia: 'au',
  澳大利亚: 'au',
  singapore: 'sg',
  新加坡: 'sg',
  'hong kong': 'hk',
  香港: 'hk',
  taiwan: 'tw',
  台湾: 'tw',
  台灣: 'tw',
  korea: 'kr',
  'south korea': 'kr',
  韩国: 'kr',
  韓國: 'kr',
  india: 'in',
  印度: 'in',
  brazil: 'br',
  巴西: 'br',
  mexico: 'mx',
  墨西哥: 'mx',
  italy: 'it',
  意大利: 'it',
  spain: 'es',
  西班牙: 'es',
  netherlands: 'nl',
  荷兰: 'nl',
  switzerland: 'ch',
  瑞士: 'ch',
  sweden: 'se',
  瑞典: 'se',
  norway: 'no',
  挪威: 'no',
  denmark: 'dk',
  丹麦: 'dk',
  finland: 'fi',
  芬兰: 'fi',
  russia: 'ru',
  俄罗斯: 'ru',
  'new zealand': 'nz',
  新西兰: 'nz',
  thailand: 'th',
  泰国: 'th',
  vietnam: 'vn',
  越南: 'vn',
  malaysia: 'my',
  马来西亚: 'my',
  indonesia: 'id',
  印尼: 'id',
  印度尼西亚: 'id',
  philippines: 'ph',
  菲律宾: 'ph',
  uae: 'ae',
  'united arab emirates': 'ae',
  阿联酋: 'ae',
}

function resolveCountryCode(country?: string): string | undefined {
  if (!country) return undefined
  const key = country.trim().toLowerCase()
  if (/^[a-z]{2}$/i.test(key)) return key
  return COUNTRY_CODES[key]
}

function buildQuery(location: Location): string {
  return locationToText(location)
}

function cacheKey(location: Location): string {
  return `v2:${buildQuery(location).toLowerCase()}`
}

async function waitForRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestAt
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed))
  }
  lastRequestAt = Date.now()
}

export async function geocodeLocation(
  location: Location,
  provider: MapProvider = 'osm',
): Promise<Location> {
  const query = buildQuery(location)
  if (!query) return location

  if (location.latitude != null && location.longitude != null) {
    return location
  }

  const key = cacheKey(location)
  const cached = await getGeocodeCache(key)
  if (cached) {
    return {
      ...location,
      latitude: cached.latitude,
      longitude: cached.longitude,
      geocodedAt: cached.cachedAt,
    }
  }

  if (provider === 'amap') {
    return location
  }

  await waitForRateLimit()

  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '1',
    addressdetails: '1',
  })

  // 有明确国家时优先限定，提高命中率；否则全球检索
  const countryCode = resolveCountryCode(location.country)
  if (countryCode) {
    params.set('countrycodes', countryCode)
  }

  const response = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8',
    },
  })

  if (!response.ok) {
    // 若带国家码失败，再试一次全球检索
    if (countryCode) {
      params.delete('countrycodes')
      await waitForRateLimit()
      const retry = await fetch(`${NOMINATIM_URL}?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'Accept-Language': 'en,zh-CN;q=0.9,zh;q=0.8',
        },
      })
      if (!retry.ok) return location
      return applyGeocodeResult(location, key, await retry.json())
    }
    return location
  }

  return applyGeocodeResult(location, key, await response.json())
}

async function applyGeocodeResult(
  location: Location,
  key: string,
  results: Array<{ lat: string; lon: string; display_name: string }>,
): Promise<Location> {
  const first = results[0]
  if (!first) return location

  const latitude = Number(first.lat)
  const longitude = Number(first.lon)
  const cachedAt = Date.now()

  await setGeocodeCache({
    key,
    latitude,
    longitude,
    displayName: first.display_name,
    cachedAt,
  })

  return {
    ...location,
    latitude,
    longitude,
    geocodedAt: cachedAt,
  }
}

export async function geocodeContactsLocations<T extends {
  birthplace?: Location
  hometown?: Location
  currentLocation?: Location
}>(
  contacts: T[],
  provider: MapProvider = 'osm',
  onProgress?: (done: number, total: number) => void,
): Promise<T[]> {
  const updated: T[] = []
  const tasks: Array<{ index: number; field: keyof Pick<T, 'birthplace' | 'hometown' | 'currentLocation'> }> = []

  contacts.forEach((contact, index) => {
    for (const field of ['birthplace', 'hometown', 'currentLocation'] as const) {
      const loc = contact[field]
      if (loc && (loc.latitude == null || loc.longitude == null) && locationToText(loc)) {
        tasks.push({ index, field })
      }
    }
  })

  const result = contacts.map((contact) => ({ ...contact }))
  let done = 0

  for (const task of tasks) {
    const current = result[task.index][task.field] as Location | undefined
    if (!current) continue
    const geocoded = await geocodeLocation(current, provider)
    result[task.index] = {
      ...result[task.index],
      [task.field]: geocoded,
    }
    done += 1
    onProgress?.(done, tasks.length)
  }

  return result.length > 0 ? result : updated
}
