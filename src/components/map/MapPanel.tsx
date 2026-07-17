import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { MapPin, Users } from 'lucide-react'
import type { LocationField } from '@/types/contact'
import { LOCATION_FIELD_LABELS, getContactLocation, locationToText } from '@/types/contact'
import { geocodeContactsLocations } from '@/lib/geocode'
import { createAvatarMarkerIcon, createClusterIcon } from '@/lib/map-marker'
import { getLinkedOnline } from '@/lib/presence'
import { useContacts } from '@/context/ContactsContext'
import { usePresenceState } from '@/context/PresenceContext'
import { PageHeader } from '@/components/ui/PageHeader'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { FitBounds } from './FitBounds'
import { MapPopup } from './MapPopup'
import 'leaflet.markercluster/dist/MarkerCluster.css'

export function MapPanel() {
  const { contacts, saveContactBatch } = useContacts()
  const presence = usePresenceState()
  const [locationField, setLocationField] = useState<LocationField>('hometown')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [geocoding, setGeocoding] = useState(false)
  const [progress, setProgress] = useState('')
  const [localContacts, setLocalContacts] = useState(contacts)

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
          label: locationToText(location),
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

  return (
    <div className="page-stack">
      <PageHeader
        title="地图分布"
        description="重叠标记会聚合；关联账号显示在线状态。"
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
            <FitBounds positions={markers.map((marker) => marker.position)} />
            <MarkerClusterGroup
              chunkedLoading
              showCoverageOnHover={false}
              maxClusterRadius={56}
              spiderfyOnMaxZoom
              spiderfyDistanceMultiplier={1.4}
              disableClusteringAtZoom={16}
              iconCreateFunction={createClusterIcon}
            >
              {markers.map((marker) => (
                <Marker
                  key={`${marker.id}-${marker.online ? 'on' : 'off'}`}
                  position={marker.position}
                  icon={marker.icon}
                >
                  <Popup>
                    <MapPopup
                      name={marker.name}
                      avatar={marker.avatar}
                      locationLabel={`${LOCATION_FIELD_LABELS[locationField]}：${marker.label}`}
                      tags={marker.tags}
                      online={marker.online}
                    />
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      </section>
    </div>
  )
}
