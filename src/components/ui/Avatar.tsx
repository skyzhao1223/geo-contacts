import { useEffect, useState } from 'react'
import { getAvatarGradient, getAvatarInitials } from '../../lib/avatar-color'

interface AvatarProps {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
}

const sizes = {
  sm: 'avatar-sm',
  md: 'avatar-md',
  lg: 'avatar-lg',
}

export function Avatar({ name, src, size = 'md', online, className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  const initials = getAvatarInitials(name)
  const showImage = Boolean(src) && !failed

  useEffect(() => {
    setFailed(false)
  }, [src])

  return (
    <div
      className={`avatar ${sizes[size]} ${className}`.trim()}
      style={{ background: getAvatarGradient(name) }}
      aria-label={name}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          className="avatar-img"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="avatar-fallback" aria-hidden="true">
          {initials}
        </span>
      )}
      {online != null && (
        <span className={`avatar-status ${online ? 'avatar-status-on' : ''}`} />
      )}
    </div>
  )
}
