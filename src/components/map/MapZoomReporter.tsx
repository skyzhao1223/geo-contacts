import { useEffect } from 'react'
import { useMap, useMapEvents } from 'react-leaflet'
import { regionLevelForZoom, type RegionLevel } from '@/lib/region-cluster'

interface MapZoomReporterProps {
  onZoomChange: (zoom: number, level: RegionLevel) => void
}

/** 把当前缩放与地区聚合级别上报给外层 UI */
export function MapZoomReporter({ onZoomChange }: MapZoomReporterProps) {
  const map = useMap()

  const report = () => {
    const zoom = map.getZoom()
    onZoomChange(zoom, regionLevelForZoom(zoom))
  }

  useMapEvents({
    zoomend: report,
    zoom: report,
  })

  useEffect(() => {
    report()
  }, [map])

  return null
}
