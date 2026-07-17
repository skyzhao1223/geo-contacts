import { useEffect } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

export function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap()

  useEffect(() => {
    if (positions.length === 0) {
      map.setView([20, 0], 2)
      return
    }
    if (positions.length === 1) {
      map.setView(positions[0], 10)
      return
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 12 })
  }, [map, positions])

  return null
}
