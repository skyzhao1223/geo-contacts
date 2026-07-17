import type { ReactNode } from 'react'
import type { UserProfile } from '@/types/user'
import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'

interface UserCardProps {
  user: UserProfile
  online: boolean
  actions: ReactNode
}

export function UserCard({ user, online, actions }: UserCardProps) {
  return (
    <div className="friend-card">
      <Avatar name={user.displayName} src={user.avatar ?? undefined} size="md" online={online} />
      <div className="friend-main">
        <div className="friend-top">
          <strong>{user.displayName}</strong>
          <OnlineBadge online={online} lastSeenAt={user.lastSeenAt} />
        </div>
        {user.bio && <p className="friend-bio">{user.bio}</p>}
        <div className="friend-meta">
          {user.hometown?.city && <span>籍贯 {user.hometown.city}</span>}
          {user.currentLocation?.city && <span>现居 {user.currentLocation.city}</span>}
        </div>
      </div>
      <div className="friend-actions">{actions}</div>
    </div>
  )
}
