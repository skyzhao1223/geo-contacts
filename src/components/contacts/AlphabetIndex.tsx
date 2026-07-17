import { useCallback, useRef, useState } from 'react'
import { LETTERS } from '@/lib/name-index'

interface AlphabetIndexProps {
  letters: string[]
  activeLetter: string | null
  onSelect: (letter: string) => void
}

export function AlphabetIndex({ letters, activeLetter, onSelect }: AlphabetIndexProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [hint, setHint] = useState<string | null>(null)

  const pickFromPoint = useCallback(
    (clientY: number) => {
      const track = trackRef.current
      if (!track || letters.length === 0) return

      const rect = track.getBoundingClientRect()
      const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height))
      const index = Math.min(letters.length - 1, Math.floor(ratio * letters.length))
      const letter = letters[index]
      onSelect(letter)
      setHint(letter)
    },
    [letters, onSelect],
  )

  if (letters.length < 2) return null

  return (
    <>
      {hint && <div className="alphabet-hint">{hint}</div>}
      <div
        ref={trackRef}
        className="alphabet-index"
        role="navigation"
        aria-label="字母索引"
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId)
          pickFromPoint(event.clientY)
        }}
        onPointerMove={(event) => {
          if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
          pickFromPoint(event.clientY)
        }}
        onPointerUp={() => setHint(null)}
        onPointerCancel={() => setHint(null)}
      >
        {LETTERS.map((letter) => {
          const enabled = letters.includes(letter)
          return (
            <span
              key={letter}
              className={[
                'alphabet-index-item',
                enabled ? '' : 'alphabet-index-item-disabled',
                activeLetter === letter ? 'alphabet-index-item-active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-hidden={!enabled}
            >
              {letter}
            </span>
          )
        })}
        {letters.includes('#') && (
          <span
            className={`alphabet-index-item ${activeLetter === '#' ? 'alphabet-index-item-active' : ''}`}
          >
            #
          </span>
        )}
      </div>
    </>
  )
}
