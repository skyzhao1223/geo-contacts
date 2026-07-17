import { Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { createRegionClusterIcon } from '@/lib/map-marker'
import {
  zoomAfterRegionExpand,
  type RegionCluster,
} from '@/lib/region-cluster'

interface RegionClusterMarkersProps {
  clusters: RegionCluster[]
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
          eventHandlers={{
            click: () => {
              const bounds = L.latLngBounds(cluster.bounds)
              const targetZoom = zoomAfterRegionExpand(cluster.level, map.getZoom())
              // 强制进入下一维度比例尺，避免 fitBounds 停在同一维度带内
              if (cluster.bounds.length === 1 || bounds.getNorthEast().equals(bounds.getSouthWest())) {
                map.setView(cluster.position, targetZoom, { animate: true })
                return
              }
              map.fitBounds(bounds.pad(0.2), {
                maxZoom: targetZoom,
                padding: [48, 48],
                animate: true,
              })
              // fitBounds 可能因范围过大停在更低 zoom；保证至少进入下一维度
              window.setTimeout(() => {
                if (map.getZoom() < targetZoom) {
                  map.setZoom(targetZoom)
                }
              }, 280)
            },
          }}
        >
          <Popup>
            <div className="popup-person">
              <strong>{cluster.title}</strong>
              <div className="popup-meta">{cluster.count} 人 · 点击展开</div>
              <ul className="region-cluster-list">
                {cluster.members.slice(0, 8).map((member) => (
                  <li key={member.id}>{member.name}</li>
                ))}
                {cluster.members.length > 8 && (
                  <li>…还有 {cluster.members.length - 8} 人</li>
                )}
              </ul>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  )
}
