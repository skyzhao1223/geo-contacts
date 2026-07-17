const GRADIENTS = [
  'linear-gradient(145deg, #7dd3fc 0%, #2563eb 55%, #1d4ed8 100%)',
  'linear-gradient(145deg, #6ee7b7 0%, #059669 55%, #047857 100%)',
  'linear-gradient(145deg, #c4b5fd 0%, #7c3aed 55%, #6d28d9 100%)',
  'linear-gradient(145deg, #fda4af 0%, #e11d48 55%, #be123c 100%)',
  'linear-gradient(145deg, #fcd34d 0%, #d97706 55%, #b45309 100%)',
  'linear-gradient(145deg, #67e8f9 0%, #0891b2 55%, #0e7490 100%)',
  'linear-gradient(145deg, #f9a8d4 0%, #db2777 55%, #be185d 100%)',
  'linear-gradient(145deg, #a5b4fc 0%, #4f46e5 55%, #4338ca 100%)',
]

export function getAvatarGradient(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

/** 中文取首字；英文取至多两个首字母 */
export function getAvatarInitials(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'

  const first = trimmed[0]
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(first)) {
    return first
  }

  const parts = trimmed.split(/[\s\-·.]+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }

  return trimmed.slice(0, 2).toUpperCase()
}
