import { useEffect, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

/** 仅在 zoomend 更新，避免滚轮缩放时每帧重聚类 */
export function useMapZoom(initialZoom = 2): number {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom() || initialZoom)

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  })

  useEffect(() => {
    setZoom(map.getZoom())
  }, [map])

  return zoom
}
