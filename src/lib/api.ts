import type { UserProfile } from '../types/user'
import type { ChatMessage, ConversationSummary } from '../types/message'

const TOKEN_KEY = 'geo-contacts-token'

/** Vite base，如 `/` 或 `/geo-contacts/` */
function appBase(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

/** 站点子路径前缀：`''` 或 `'/geo-contacts'` */
export function sitePrefix(): string {
  return appBase().replace(/\/$/, '')
}

function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path.slice(1) : path
  return `${appBase()}${normalized}`
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken()
  const headers = new Headers(init?.headers)
  headers.set('Content-Type', 'application/json')
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
  })

  const data = (await response.json().catch(() => ({}))) as { error?: string }
  if (!response.ok) {
    throw new ApiError(data.error ?? '请求失败', response.status)
  }

  return data as T
}

export const api = {
  register(email: string, password: string, displayName: string) {
    return request<{ token: string; user: UserProfile }>('api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    })
  },

  login(email: string, password: string) {
    return request<{ token: string; user: UserProfile }>('api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  },

  /** 用站内 dashboard_session Cookie 换本应用 JWT */
  sso() {
    return request<{ token: string; user: UserProfile }>('api/auth/sso', {
      method: 'POST',
      credentials: 'include',
    })
  },

  me() {
    return request<{ user: UserProfile }>('api/auth/me')
  },

  updateProfile(payload: Partial<UserProfile>) {
    return request<{ user: UserProfile }>('api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
  },

  searchUsers(q: string) {
    return request<{ users: UserProfile[] }>(`api/users/search?q=${encodeURIComponent(q)}`)
  },

  getUser(id: string) {
    return request<{ user: UserProfile }>(`api/users/${id}`)
  },

  listFriends() {
    return request<{ friends: Array<{ friendshipId: string; since: number; user: UserProfile }> }>(
      'api/friends',
    )
  },

  listFriendRequests() {
    return request<{
      incoming: Array<{ friendshipId: string; createdAt: number; user: UserProfile }>
      outgoing: Array<{ friendshipId: string; createdAt: number; user: UserProfile }>
    }>('api/friends/requests')
  },

  sendFriendRequest(userId: string) {
    return request<{ friendshipId: string; status: string; autoAccepted?: boolean }>(
      'api/friends/request',
      {
        method: 'POST',
        body: JSON.stringify({ userId }),
      },
    )
  },

  acceptFriendRequest(friendshipId: string) {
    return request<{ friendshipId: string; status: string }>('api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    })
  },

  rejectFriendRequest(friendshipId: string) {
    return request<{ friendshipId: string; status: string }>('api/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ friendshipId }),
    })
  },

  removeFriend(friendshipId: string) {
    return request<{ ok: boolean }>(`api/friends/${friendshipId}`, {
      method: 'DELETE',
    })
  },

  listConversations() {
    return request<{ conversations: ConversationSummary[] }>('api/messages/conversations')
  },

  openConversation(peerUserId: string) {
    return request<{ conversation: ConversationSummary }>('api/messages/conversations', {
      method: 'POST',
      body: JSON.stringify({ peerUserId }),
    })
  },

  listMessages(conversationId: string, opts?: { before?: number; limit?: number }) {
    const params = new URLSearchParams()
    if (opts?.before) params.set('before', String(opts.before))
    if (opts?.limit) params.set('limit', String(opts.limit))
    const qs = params.toString()
    return request<{ messages: ChatMessage[] }>(
      `api/messages/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
    )
  },

  sendMessage(conversationId: string, body: string) {
    return request<{ message: ChatMessage }>(
      `api/messages/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ body }),
      },
    )
  },

  markConversationRead(conversationId: string) {
    return request<{ ok: boolean; lastReadAt: number }>(
      `api/messages/conversations/${conversationId}/read`,
      { method: 'POST' },
    )
  },

  getUnreadCount() {
    return request<{ unreadCount: number }>('api/messages/unread-count')
  },
}

export function getWebSocketUrl(token: string) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const prefix = sitePrefix()
  return `${protocol}//${window.location.host}${prefix}/ws?token=${encodeURIComponent(token)}`
}
