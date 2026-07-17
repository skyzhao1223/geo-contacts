import type { Location } from './contact'

export interface UserProfile {
  id: string
  email?: string
  displayName: string
  avatar?: string | null
  bio?: string | null
  birthplace?: Location | null
  hometown?: Location | null
  currentLocation?: Location | null
  lastSeenAt?: number | null
  online?: boolean
  createdAt?: number
}

export interface FriendItem {
  friendshipId: string
  since: number
  user: UserProfile
}

export interface FriendRequestItem {
  friendshipId: string
  createdAt: number
  user: UserProfile
}

export interface PresenceState {
  [userId: string]: {
    online: boolean
    lastSeenAt: number | null
  }
}
