import { useEffect, useState } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'

/** 订阅当前地图缩放级别 */
export function useMapZoom(initialZoom = 2): number {
  const map = useMap()
  const [zoom, setZoom] = useState(() => map.getZoom() || initialZoom)

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    zoom: () => setZoom(map.getZoom()),
  })

  useEffect(() => {
    setZoom(map.getZoom())
  }, [map])

  return zoom
}
