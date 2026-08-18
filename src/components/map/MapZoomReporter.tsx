import { useEffect, useRef } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { regionLevelForZoom, type RegionLevel } from '@/lib/geo/region-cluster'

interface MapZoomReporterProps {
  onZoomChange: (zoom: number, level: RegionLevel) => void
}

/** 把当前缩放与地区聚合级别上报给外层 UI（仅 zoomend） */
export function MapZoomReporter({ onZoomChange }: MapZoomReporterProps) {
  const map = useMap()
  const onZoomChangeRef = useRef(onZoomChange)
  onZoomChangeRef.current = onZoomChange

  const report = () => {
    const zoom = map.getZoom()
    onZoomChangeRef.current(zoom, regionLevelForZoom(zoom))
  }

  useMapEvents({
    zoomend: report,
  })

  useEffect(() => {
    report()
  }, [map])

  return null
}
