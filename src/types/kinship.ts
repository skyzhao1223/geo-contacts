export type KinshipType = 'parent' | 'spouse'
export type ParentRole = 'father' | 'mother' | 'parent'

export interface Kinship {
  id: string
  /** parent: 子女；spouse: 较小 id */
  fromId: string
  /** parent: 父母；spouse: 较大 id */
  toId: string
  type: KinshipType
  role?: ParentRole
  createdAt: number
}

export function createKinship(
  partial: Omit<Kinship, 'id' | 'createdAt'> & { id?: string; createdAt?: number },
): Kinship {
  return {
    id: partial.id ?? crypto.randomUUID(),
    fromId: partial.fromId,
    toId: partial.toId,
    type: partial.type,
    role: partial.role,
    createdAt: partial.createdAt ?? Date.now(),
  }
}

/** 配偶边规范化：较小 id 为 fromId */
export function normalizeSpousePair(a: string, b: string): { fromId: string; toId: string } {
  return a < b ? { fromId: a, toId: b } : { fromId: b, toId: a }
}
