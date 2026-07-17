import { getAvatarGradient } from '../../lib/avatar-color'

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
  const initial = name.slice(0, 1) || '?'

  return (
    <div
      className={`avatar ${sizes[size]} ${className}`.trim()}
      style={!src ? { background: getAvatarGradient(name) } : undefined}
    >
      {src ? (
        <img src={src} alt={name} className="avatar-img" loading="lazy" />
      ) : (
        <span className="avatar-fallback">{initial}</span>
      )}
      {online != null && (
        <span className={`avatar-status ${online ? 'avatar-status-on' : ''}`} />
      )}
    </div>
  )
}
