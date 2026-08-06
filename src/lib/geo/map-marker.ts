import L from 'leaflet'
import 'leaflet.markercluster'

import { getAvatarGradient, getAvatarInitials } from './avatar-color'

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
  const initials = escapeHtml(getAvatarInitials(name))
  const safeName = escapeHtml(name)
  const gradient = escapeHtml(getAvatarGradient(name))
  const fallback = `<span class="map-marker-avatar-fallback" style="background:${gradient}">${initials}</span>`
  const inner = avatar
    ? `${fallback}<img src="${escapeHtml(avatar)}" alt="${safeName}" class="map-marker-avatar-img" loading="lazy" onerror="this.remove()" />`
    : fallback

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

/** 按地名长度估算气泡尺寸，避免长地名被裁切 */
function measureRegionChip(title: string, count: number): {
  width: number
  height: number
  multiline: boolean
} {
  let textWidth = 0
  for (const char of title) {
    textWidth += /[\u3400-\u9fff\uF900-\uFAFF]/.test(char) ? 13 : 7.2
  }

  const countWidth = 26 + String(count).length * 7
  const padding = 32
  const singleLineWidth = Math.ceil(countWidth + textWidth + padding)
  const maxSingle = 240

  if (singleLineWidth <= maxSingle) {
    return {
      width: Math.max(singleLineWidth, 72),
      height: 44,
      multiline: false,
    }
  }

  const width = Math.min(Math.max(180, Math.ceil(maxSingle)), 300)
  const textArea = Math.max(width - countWidth - padding, 80)
  const lines = Math.min(Math.max(Math.ceil(textWidth / textArea), 2), 3)
  return {
    width,
    height: 18 + lines * 17 + 16,
    multiline: true,
  }
}

/** 地区聚合气泡：地区名 + 人数（宽度随地名自适应） */
export function createRegionClusterIcon(title: string, count: number): L.DivIcon {
  const size = count >= 50 ? 'lg' : count >= 10 ? 'md' : 'sm'
  const { width, height, multiline } = measureRegionChip(title, count)
  const safeTitle = escapeHtml(title)
  const wrapClass = multiline ? ' map-region-cluster-wrap' : ''

  return L.divIcon({
    html: `<div class="map-region-cluster map-region-cluster-${size}${wrapClass}"><span class="map-region-cluster-count">${count}</span><span class="map-region-cluster-title">${safeTitle}</span></div>`,
    className: 'map-cluster-icon map-region-cluster-icon',
    iconSize: L.point(width, height),
    iconAnchor: [width / 2, height / 2],
    popupAnchor: [0, -height / 2 - 4],
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
