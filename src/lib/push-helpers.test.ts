import { describe, expect, it } from 'vitest'

/**
 * Pure helpers mirrored from server/push.ts for unit tests without loading better-sqlite3/web-push.
 * Keep in sync with truncate / urlBase behavior.
 */
function truncatePreview(text: string, max = 100): string {
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function pushUrlBase(env: { PUBLIC_PATH_PREFIX?: string; VITE_BASE?: string }): string {
  const raw = env.PUBLIC_PATH_PREFIX?.trim() || env.VITE_BASE?.trim() || ''
  if (!raw || raw === '/') return ''
  return raw.replace(/\/$/, '')
}

function normalizeNotificationUrl(url: string | undefined, base: string): string {
  if (!url) return base ? `${base}/` : '/'
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  let path = url.startsWith('/') ? url : `/${url}`
  if (base && path !== base && !path.startsWith(`${base}/`)) {
    path = `${base}${path}`
  }
  return path.replace(/\/{2,}/g, '/')
}

describe('push helpers', () => {
  it('truncates long previews', () => {
    const body = '你'.repeat(120)
    const out = truncatePreview(body)
    expect(out.length).toBe(100)
    expect(out.endsWith('…')).toBe(true)
  })

  it('builds url base from PUBLIC_PATH_PREFIX', () => {
    expect(pushUrlBase({ PUBLIC_PATH_PREFIX: '/geo-contacts/' })).toBe('/geo-contacts')
    expect(pushUrlBase({ VITE_BASE: '/geo-contacts/' })).toBe('/geo-contacts')
    expect(pushUrlBase({})).toBe('')
  })

  it('prepends basename to absolute deep links', () => {
    expect(normalizeNotificationUrl('/messages/abc', '/geo-contacts')).toBe(
      '/geo-contacts/messages/abc',
    )
    expect(normalizeNotificationUrl('/geo-contacts/messages/abc', '/geo-contacts')).toBe(
      '/geo-contacts/messages/abc',
    )
  })
})
