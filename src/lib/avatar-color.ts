const GRADIENTS = [
  'linear-gradient(135deg, #60a5fa, #2563eb)',
  'linear-gradient(135deg, #34d399, #059669)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #fb7185, #e11d48)',
  'linear-gradient(135deg, #fbbf24, #d97706)',
  'linear-gradient(135deg, #22d3ee, #0891b2)',
  'linear-gradient(135deg, #f472b6, #db2777)',
  'linear-gradient(135deg, #818cf8, #4f46e5)',
]

export function getAvatarGradient(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}
