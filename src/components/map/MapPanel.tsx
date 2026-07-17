import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import type { DivIcon } from 'leaflet'
import { MapPin, Users } from 'lucide-react'
import type { LocationField } from '@/types/contact'
import { LOCATION_FIELD_LABELS, getContactLocation, locationToText } from '@/types/contact'
import { geocodeContactsLocations } from '@/lib/geocode'
import { createAvatarMarkerIcon } from '@/lib/map-marker'
import {
  clusterByRegion,
  type RegionLevel,
  type RegionPoint,
} from '@/lib/region-cluster'
import { getLinkedOnline } from '@/lib/presence'
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
  country: '按国家聚合',
  province: '按省/州聚合',
  city: '按城市聚合',
  person: '显示个人',
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
  const [localContacts, setLocalContacts] = useState(contacts)
  const [regionLevel, setRegionLevel] = useState<RegionLevel>('country')

  useEffect(() => {
    setLocalContacts(contacts)
  }, [contacts])

  const tags = useMemo(() => {
    const all = localContacts.flatMap((contact) => contact.tags)
    return [...new Set(all)].sort()
  }, [localContacts])

  const filteredContacts = useMemo(() => {
    if (!selectedTag) return localContacts
    return localContacts.filter((contact) => contact.tags.includes(selectedTag))
  }, [localContacts, selectedTag])

  const markers = useMemo(() => {
    return filteredContacts
      .map((contact) => {
        const location = getContactLocation(contact, locationField)
        if (!location?.latitude || !location.longitude) return null
        const online = getLinkedOnline(presence, contact.linkedUserId)
        return {
          id: contact.id,
          name: contact.name,
          avatar: contact.avatar,
          location,
          label: `${LOCATION_FIELD_LABELS[locationField]}：${locationToText(location)}`,
          tags: contact.tags,
          online,
          icon: createAvatarMarkerIcon(contact.name, contact.avatar, online),
          position: [location.latitude, location.longitude] as [number, number],
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
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

  const handleGeocode = async () => {
    setGeocoding(true)
    setProgress('正在解析地址...')
    const updated = await geocodeContactsLocations(localContacts, 'osm', (done, total) => {
      setProgress(`地理编码 ${done}/${total}`)
    })
    await saveContactBatch(updated)
    setLocalContacts(updated)
    setGeocoding(false)
    setProgress('')
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
        description="按国家 → 省/州 → 城市分层聚合；放大或点击气泡展开到下一层。"
        compact
        actions={
          missingCount > 0 ? (
            <button
              type="button"
              className="button-secondary"
              disabled={geocoding}
              onClick={() => void handleGeocode()}
            >
              <MapPin size={16} />
              {geocoding ? progress || '解析中...' : `解析 ${missingCount} 个地址`}
            </button>
          ) : undefined
        }
      />

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
                className={`filter-chip ${selectedTag === tag ? 'filter-chip-active' : ''}`}
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
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
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
