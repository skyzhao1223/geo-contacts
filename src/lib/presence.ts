import type { PresenceState } from '@/types/user'

export function isUserOnline(
  presence: PresenceState,
  userId?: string,
  fallback?: boolean,
): boolean {
  if (!userId) return false
  if (presence[userId] != null) return presence[userId].online
  return fallback ?? false
}

/** 仅真实平台用户（有 linkedUserId）返回在线态；普通联系人返回 undefined */
export function getLinkedOnline(
  presence: PresenceState,
  linkedUserId?: string,
  fallback?: boolean,
): boolean | undefined {
  if (!linkedUserId) return undefined
  return isUserOnline(presence, linkedUserId, fallback)
}

export function getLinkedLastSeen(
  presence: PresenceState,
  linkedUserId?: string,
): number | null | undefined {
  if (!linkedUserId) return undefined
  return presence[linkedUserId]?.lastSeenAt
}
