import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { createRegionClusterIcon } from '@/lib/geo/map-marker'
import {
  zoomAfterRegionExpand,
  type RegionCluster,
  type RegionLevel,
} from '@/lib/geo/region-cluster'

interface RegionClusterMarkersProps {
  clusters: RegionCluster[]
}

const NEXT_LEVEL_HINT: Record<RegionLevel, string> = {
  country: '放大到省/州',
  province: '放大到城市',
  city: '放大到个人',
  person: '查看',
}

function expandCluster(map: L.Map, cluster: RegionCluster) {
  const bounds = L.latLngBounds(cluster.bounds)
  const targetZoom = zoomAfterRegionExpand(cluster.level, map.getZoom())

  map.closePopup()

  if (
    cluster.bounds.length === 1 ||
    bounds.getNorthEast().equals(bounds.getSouthWest())
  ) {
    map.setView(cluster.position, targetZoom, { animate: true })
    return
  }

  map.fitBounds(bounds.pad(0.2), {
    maxZoom: targetZoom,
    padding: [48, 48],
    animate: true,
  })

  window.setTimeout(() => {
    if (map.getZoom() < targetZoom) {
      map.setZoom(targetZoom)
    }
  }, 280)
}

export function RegionClusterMarkers({ clusters }: RegionClusterMarkersProps) {
  const map = useMap()

  return (
    <>
      {clusters.map((cluster) => (
        <Marker
          key={cluster.key}
          position={cluster.position}
          icon={createRegionClusterIcon(cluster.title, cluster.count)}
        >
          <Popup maxWidth={320} className="region-cluster-popup">
            <div className="popup-person region-cluster-popup-body">
              <div className="region-cluster-popup-title">{cluster.title}</div>
              <div className="popup-meta">{cluster.count} 人</div>
              <ul className="region-cluster-list">
                {cluster.members.slice(0, 12).map((member) => (
                  <li key={member.id}>
                    <span className="region-cluster-member-name">{member.name}</span>
                    {member.label ? (
                      <span className="region-cluster-member-loc">{member.label}</span>
                    ) : null}
                  </li>
                ))}
                {cluster.members.length > 12 && (
                  <li>…还有 {cluster.members.length - 12} 人</li>
                )}
              </ul>
              <button
                type="button"
                className="button-primary region-cluster-expand"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  expandCluster(map, cluster)
                }}
              >
                {NEXT_LEVEL_HINT[cluster.level]}
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
