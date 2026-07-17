import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/** 仅在标注集合变化时自适应视野，避免打断用户缩放/地区展开 */
export function FitBounds({
  positions,
  resetKey,
}: {
  positions: [number, number][]
  resetKey?: string
}) {
  const map = useMap()
  const fittedKey = useRef<string | null>(null)

  useEffect(() => {
    const key = resetKey ?? positions.map((p) => p.join(',')).join('|')
    if (fittedKey.current === key) return
    fittedKey.current = key

    if (positions.length === 0) {
      map.setView([20, 0], 2)
      return
    }
    if (positions.length === 1) {
      map.setView(positions[0], 10)
      return
    }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 4 })
  }, [map, positions, resetKey])

  return null
}
