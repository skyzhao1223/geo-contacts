import { pinyin } from 'pinyin-pro'

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

export function getNameIndexLetter(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '#'

  const first = trimmed[0]
  if (/[A-Za-z]/.test(first)) {
    return first.toUpperCase()
  }

  if (/[0-9]/.test(first)) {
    return '#'
  }

  try {
    const initial = pinyin(first, {
      pattern: 'first',
      toneType: 'none',
      type: 'array',
    })[0]

    if (initial && /^[a-z]$/i.test(initial)) {
      return initial.toUpperCase()
    }
  } catch {
    // fall through
  }

  return '#'
}

export function getIndexLetters(available: Set<string>): string[] {
  const letters = LETTERS.filter((letter) => available.has(letter))
  if (available.has('#')) {
    letters.push('#')
  }
  return letters
}

export { LETTERS }
