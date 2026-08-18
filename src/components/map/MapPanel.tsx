import { useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { DivIcon } from 'leaflet'
import { MapPin, Users } from 'lucide-react'
import type { LocationField } from '@/types/contact'
import { LOCATION_FIELD_LABELS, getContactLocation, locationToText } from '@/types/contact'
import { GeocodeCancelledError, geocodeContactsLocations } from '@/lib/geo/geocode'
import { createAvatarMarkerIcon } from '@/lib/geo/map-marker'
import {
  clusterByRegion,
  regionLevelLabel,
  type RegionLevel,
  type RegionPoint,
} from '@/lib/geo/region-cluster'
import { getLinkedOnline } from '@/lib/presence'
import { sortTagsForDisplay, SYSTEM_FAMILY_TAG } from '@/lib/family/system-tags'
import { useContacts } from '@/context/ContactsContext'
import { usePresenceState } from '@/context/PresenceContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FitBounds } from './FitBounds'
import { MapPopup } from './MapPopup'
import { MapZoomReporter } from './MapZoomReporter'
import { RegionClusterMarkers } from './RegionClusterMarkers'
import { useMapZoom } from './useMapZoom'

const REGION_LEVEL_HINT: Record<RegionLevel, string> = {
  country: regionLevelLabel('country'),
  province: regionLevelLabel('province'),
  city: regionLevelLabel('city'),
  person: regionLevelLabel('person'),
}

type MapPoint = RegionPoint & { icon: DivIcon }

function MapMarkersLayer({ points }: { points: MapPoint[] }) {
  const zoom = useMapZoom(2)
  const { clusters, singles } = useMemo(
    () =>
      clusterByRegion(
        points.map(({ icon: _icon, ...point }) => point),
        zoom,
      ),
    [points, zoom],
  )

  const singleIcons = useMemo(() => {
    const byId = new Map(points.map((point) => [point.id, point.icon]))
    return singles.map((point) => ({
      ...point,
      icon: byId.get(point.id)!,
    }))
  }, [points, singles])

  return (
    <>
      <RegionClusterMarkers clusters={clusters} />
      {singleIcons.map((marker) => (
        <Marker
          key={`${marker.id}-${marker.online ? 'on' : 'off'}`}
          position={marker.position}
          icon={marker.icon}
        >
          <Popup>
            <MapPopup
              name={marker.name}
              avatar={marker.avatar}
              locationLabel={marker.label}
              tags={marker.tags}
              online={marker.online ?? undefined}
            />
          </Popup>
        </Marker>
      ))}
    </>
  )
}

export function MapPanel() {
  const { contacts, saveContactBatch } = useContacts()
  const presence = usePresenceState()
  const [locationField, setLocationField] = useState<LocationField>('hometown')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [progress, setProgress] = useState('')
  const [geocodeError, setGeocodeError] = useState('')
  const [localContacts, setLocalContacts] = useState(contacts)
  const [regionLevel, setRegionLevel] = useState<RegionLevel>('country')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setLocalContacts(contacts)
  }, [contacts])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const tags = useMemo(() => {
    const all = localContacts.flatMap((contact) => contact.tags)
    return sortTagsForDisplay([...new Set(all)])
  }, [localContacts])

  const filteredContacts = useMemo(() => {
    if (!selectedTag) return localContacts
    return localContacts.filter((contact) => contact.tags.includes(selectedTag))
  }, [localContacts, selectedTag])

  const iconCacheRef = useRef(new Map<string, DivIcon>())

  const markers = useMemo(() => {
    const cache = iconCacheRef.current
    const liveKeys = new Set<string>()

    const next = filteredContacts
      .map((contact) => {
        const location = getContactLocation(contact, locationField)
        if (!location?.latitude || !location.longitude) return null
        const online = getLinkedOnline(presence, contact.linkedUserId)
        const cacheKey = `${contact.id}|${contact.name}|${contact.avatar ?? ''}|${online ?? 'na'}`
        liveKeys.add(cacheKey)
        let icon = cache.get(cacheKey)
        if (!icon) {
          icon = createAvatarMarkerIcon(contact.name, contact.avatar, online)
          cache.set(cacheKey, icon)
        }
        return {
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          location,
          label: `${LOCATION_FIELD_LABELS[locationField]}：${locationToText(location)}`,
          tags: contact.tags,
          online,
          icon,
          position: [location.latitude, location.longitude] as [number, number],
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)

    for (const key of cache.keys()) {
      if (!liveKeys.has(key)) cache.delete(key)
    }

    return next
  }, [filteredContacts, locationField, presence])

  const onlineOnMap = useMemo(
    () => markers.filter((marker) => marker.online === true).length,
    [markers],
  )

  const missingCount = useMemo(() => {
    return filteredContacts.filter((contact) => {
      const location = getContactLocation(contact, locationField)
      return location && locationToText(location) && (!location.latitude || !location.longitude)
    }).length
  }, [filteredContacts, locationField])

  const cancelGeocode = () => {
    abortRef.current?.abort()
  }

  const handleGeocode = async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setGeocoding(true)
    setGeocodeError('')
    setProgress('正在解析地址...')
    try {
      const { contacts: updated, changed } = await geocodeContactsLocations(
        localContacts,
        'osm',
        (done, total) => {
          setProgress(`地理编码 ${done}/${total}`)
        },
        controller.signal,
      )
      if (changed.length > 0) {
        await saveContactBatch(changed)
      }
      setLocalContacts(updated)
      setProgress('')
    } catch (error) {
      if (error instanceof GeocodeCancelledError) {
        setProgress('')
        setGeocodeError('已取消地理编码')
      } else {
        setGeocodeError(error instanceof Error ? error.message : '地理编码失败，请稍后重试')
        setProgress('')
      }
    } finally {
      setGeocoding(false)
      if (abortRef.current === controller) {
        abortRef.current = null
      }
    }
  }

  const locationOptions = (Object.keys(LOCATION_FIELD_LABELS) as LocationField[]).map((field) => ({
    value: field,
    label: LOCATION_FIELD_LABELS[field],
  }))

  const fitKey = `${locationField}:${selectedTag ?? 'all'}:${markers.length}`

  return (
    <div className="page-stack">
      <PageHeader
        title="地图分布"
        description={`点「${SYSTEM_FAMILY_TAG}」标签可只看族谱成员；地区按国家 → 省/州 → 城市分层聚合。`}
        compact
        actions={
          missingCount > 0 ? (
            <div className="button-row">
              <button
                type="button"
                className="button-secondary"
                disabled={geocoding}
                onClick={() => void handleGeocode()}
              >
                <MapPin size={16} />
                {geocoding ? progress || '解析中...' : `解析 ${missingCount} 个地址`}
              </button>
              {geocoding && (
                <button type="button" className="button-ghost" onClick={cancelGeocode}>
                  取消
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      {geocodeError && (
        <div className="status-banner" role="alert">
          {geocodeError}
        </div>
      )}

      <section className="panel map-panel">
        <div className="map-toolbar">
          <SegmentedControl
            value={locationField}
            options={locationOptions}
            onChange={setLocationField}
          />
          <div className="map-stats">
            <span className="map-stat-pill">
              <Users size={14} />
              已标注 <strong>{markers.length}</strong> 人
            </span>
            {onlineOnMap > 0 && (
              <span className="map-stat-pill map-stat-online">
                在线 <strong>{onlineOnMap}</strong>
              </span>
            )}
            <span className="map-stat-pill map-stat-region">{REGION_LEVEL_HINT[regionLevel]}</span>
          </div>
        </div>

        {tags.length > 0 && (
          <div className="tag-filter-row map-tag-filter">
            <button
              type="button"
              className={`filter-chip ${selectedTag === null ? 'filter-chip-active' : ''}`}
              onClick={() => setSelectedTag(null)}
            >
              全部标签
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`filter-chip ${tag === SYSTEM_FAMILY_TAG ? 'filter-chip-system' : ''} ${selectedTag === tag ? 'filter-chip-active' : ''}`}
                onClick={() => setSelectedTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        <div className="map-frame">
          <MapContainer center={[20, 0]} zoom={2} className="leaflet-map" maxZoom={18} minZoom={2}>
            <TileLayer
              attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitBounds
              positions={markers.map((marker) => marker.position)}
              resetKey={fitKey}
            />
            <MapZoomReporter
              onZoomChange={(_zoom, level) => setRegionLevel(level)}
            />
            <MapMarkersLayer points={markers} />
          </MapContainer>
        </div>
      </section>
    </div>
  )
}
