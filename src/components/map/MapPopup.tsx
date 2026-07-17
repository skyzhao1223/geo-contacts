import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'

interface MapPopupProps {
  name: string
  avatar?: string
  locationLabel: string
  tags: string[]
  online?: boolean
}

export function MapPopup({ name, avatar, locationLabel, tags, online }: MapPopupProps) {
  return (
    <div className="popup-person">
      <div className="popup-header">
        <Avatar name={name} src={avatar} size="sm" online={online} />
        <div>
          <div className="popup-name-row">
            <strong>{name}</strong>
            {online != null && <OnlineBadge online={online} compact />}
          </div>
          <div className="popup-location">{locationLabel}</div>
        </div>
      </div>
      {tags.length > 0 && (
        <div className="popup-tags">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="tag-chip tag-chip-more">+{tags.length - 3}</span>
          )}
        </div>
      )}
    </div>
  )
}
