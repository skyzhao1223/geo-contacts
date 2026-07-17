import L from 'leaflet'
import 'leaflet.markercluster'

import { getAvatarGradient } from './avatar-color'

const MARKER_SIZE = 42

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function createAvatarMarkerIcon(
  name: string,
  avatar?: string,
  online?: boolean | null,
): L.DivIcon {
  const initial = escapeHtml(name.slice(0, 1) || '?')
  const safeName = escapeHtml(name)
  const inner = avatar
    ? `<img src="${escapeHtml(avatar)}" alt="${safeName}" class="map-marker-avatar-img" loading="lazy" />`
    : `<span class="map-marker-avatar-fallback" style="background:${escapeHtml(getAvatarGradient(name))}">${initial}</span>`

  const statusDot =
    online == null
      ? ''
      : `<span class="map-marker-status ${online ? 'map-marker-status-on' : ''}" aria-hidden="true"></span>`

  const wrapClass =
    online == null
      ? 'map-marker-avatar-wrap'
      : `map-marker-avatar-wrap ${online ? 'map-marker-wrap-online' : 'map-marker-wrap-offline'}`

  return L.divIcon({
    className: 'map-marker map-marker-avatar',
    html: `<div class="${wrapClass}">${inner}${statusDot}</div>`,
    iconSize: [MARKER_SIZE, MARKER_SIZE],
    iconAnchor: [MARKER_SIZE / 2, MARKER_SIZE / 2],
    popupAnchor: [0, -MARKER_SIZE / 2 - 4],
  })
}

export function createClusterIcon(cluster: L.MarkerCluster): L.DivIcon {
  const count = cluster.getChildCount()
  const size = count >= 50 ? 'lg' : count >= 10 ? 'md' : 'sm'
  const dimension = size === 'lg' ? 52 : size === 'md' ? 46 : 40

  return L.divIcon({
    html: `<div class="map-cluster map-cluster-${size}"><span>${count}</span></div>`,
    className: 'map-cluster-icon',
    iconSize: L.point(dimension, dimension),
    iconAnchor: [dimension / 2, dimension / 2],
  })
}
