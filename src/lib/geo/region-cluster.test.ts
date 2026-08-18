import { describe, expect, it } from 'vitest'
import {
  clusterByRegion,
  regionLevelForZoom,
  resolveRegionKey,
} from './region-cluster'
import type { RegionPoint } from './region-cluster'
import type { Location } from '../../types/contact'

function point(id: string, location: Location, position: [number, number] = [0, 0]): RegionPoint {
  return {
    id,
    name: id,
    position,
    location,
    label: id,
    tags: [],
  }
}

describe('region-cluster', () => {
  it('maps zoom bands to region levels', () => {
    expect(regionLevelForZoom(2)).toBe('country')
    expect(regionLevelForZoom(5)).toBe('province')
    expect(regionLevelForZoom(8)).toBe('city')
    expect(regionLevelForZoom(12)).toBe('person')
  })

  it('builds stable keys within a level', () => {
    const location: Location = {
      country: '中国',
      province: '浙江',
      city: '杭州',
    }
    expect(resolveRegionKey(location, 'country')).toEqual({
      key: 'country:中国',
      title: '中国',
    })
    expect(resolveRegionKey(location, 'province').key).toBe('province:中国|浙江')
    expect(resolveRegionKey(location, 'city').key).toBe('city:中国|浙江|杭州')
  })

  it('clusters by country at low zoom and shows people at high zoom', () => {
    const points = [
      point('a', { country: '中国', province: '浙江', city: '杭州' }, [30, 120]),
      point('b', { country: '中国', province: '江苏', city: '南京' }, [32, 118]),
      point('c', { country: '日本', province: '东京', city: '东京' }, [35, 139]),
    ]

    const country = clusterByRegion(points, 2)
    expect(country.level).toBe('country')
    expect(country.singles).toHaveLength(0)
    expect(country.clusters).toHaveLength(2)

    const person = clusterByRegion(points, 12)
    expect(person.level).toBe('person')
    expect(person.clusters).toHaveLength(0)
    expect(person.singles).toHaveLength(3)
  })
})
