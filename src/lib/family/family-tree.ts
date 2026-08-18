import type { Contact } from '@/types/contact'
import type { Kinship, ParentRole } from '@/types/kinship'

export interface FamilyTreeNode {
  contactId: string
  contact?: Contact
  generation: number
  parents: Array<{ contactId: string; role: ParentRole }>
  children: string[]
  spouses: string[]
}

export interface FamilyTree {
  rootId: string
  nodes: Map<string, FamilyTreeNode>
  /** 按世代分组，负数为祖先、0 为根、正数为后代 */
  generations: Map<number, string[]>
}

export interface KinshipIndex {
  parentsOf: Map<string, Array<{ contactId: string; role: ParentRole }>>
  childrenOf: Map<string, string[]>
  spousesOf: Map<string, string[]>
}

function pushUnique(list: string[], id: string): void {
  if (!list.includes(id)) list.push(id)
}

/** 一次扫描 kinships，后续 O(1) 查父母/子女/配偶 */
export function buildKinshipIndex(kinships: Kinship[]): KinshipIndex {
  const parentsOf = new Map<string, Array<{ contactId: string; role: ParentRole }>>()
  const childrenOf = new Map<string, string[]>()
  const spousesOf = new Map<string, string[]>()

  for (const kinship of kinships) {
    if (kinship.type === 'parent') {
      const parents = parentsOf.get(kinship.fromId) ?? []
      if (!parents.some((item) => item.contactId === kinship.toId)) {
        parents.push({ contactId: kinship.toId, role: kinship.role ?? 'parent' })
        parentsOf.set(kinship.fromId, parents)
      }
      const children = childrenOf.get(kinship.toId) ?? []
      pushUnique(children, kinship.fromId)
      childrenOf.set(kinship.toId, children)
      continue
    }

    if (kinship.type === 'spouse') {
      const a = spousesOf.get(kinship.fromId) ?? []
      pushUnique(a, kinship.toId)
      spousesOf.set(kinship.fromId, a)
      const b = spousesOf.get(kinship.toId) ?? []
      pushUnique(b, kinship.fromId)
      spousesOf.set(kinship.toId, b)
    }
  }

  return { parentsOf, childrenOf, spousesOf }
}

function ensureNode(
  nodes: Map<string, FamilyTreeNode>,
  contactId: string,
  generation: number,
  contacts: Map<string, Contact>,
): FamilyTreeNode {
  const existing = nodes.get(contactId)
  if (existing) {
    if (existing.generation > generation) existing.generation = generation
    return existing
  }
  const node: FamilyTreeNode = {
    contactId,
    contact: contacts.get(contactId),
    generation,
    parents: [],
    children: [],
    spouses: [],
  }
  nodes.set(contactId, node)
  return node
}

export function getParents(
  kinships: Kinship[],
  childId: string,
): Array<{ contactId: string; role: ParentRole }> {
  return kinships
    .filter((k) => k.type === 'parent' && k.fromId === childId)
    .map((k) => ({ contactId: k.toId, role: k.role ?? 'parent' }))
}

export function getChildren(kinships: Kinship[], parentId: string): string[] {
  return kinships
    .filter((k) => k.type === 'parent' && k.toId === parentId)
    .map((k) => k.fromId)
}

export function getSpouses(kinships: Kinship[], personId: string): string[] {
  return kinships
    .filter((k) => k.type === 'spouse' && (k.fromId === personId || k.toId === personId))
    .map((k) => (k.fromId === personId ? k.toId : k.fromId))
}

/**
 * 以 rootId 为中心构建家族树：上溯父母、下延子女，并挂上配偶。
 */
export function buildFamilyTree(
  rootId: string,
  kinships: Kinship[],
  contacts: Contact[],
  maxAncestorDepth = 5,
  maxDescendantDepth = 5,
): FamilyTree {
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const nodes = new Map<string, FamilyTreeNode>()
  const index = buildKinshipIndex(kinships)

  const walkUp = (personId: string, generation: number, depth: number) => {
    const node = ensureNode(nodes, personId, generation, contactMap)
    if (depth >= maxAncestorDepth) return

    for (const parent of index.parentsOf.get(personId) ?? []) {
      if (!node.parents.some((p) => p.contactId === parent.contactId)) {
        node.parents.push(parent)
      }
      const parentNode = ensureNode(nodes, parent.contactId, generation - 1, contactMap)
      if (!parentNode.children.includes(personId)) {
        parentNode.children.push(personId)
      }
      walkUp(parent.contactId, generation - 1, depth + 1)
    }
  }

  const walkDown = (personId: string, generation: number, depth: number) => {
    ensureNode(nodes, personId, generation, contactMap)
    if (depth >= maxDescendantDepth) return

    for (const childId of index.childrenOf.get(personId) ?? []) {
      const node = ensureNode(nodes, personId, generation, contactMap)
      if (!node.children.includes(childId)) node.children.push(childId)

      const childNode = ensureNode(nodes, childId, generation + 1, contactMap)
      for (const parent of index.parentsOf.get(childId) ?? []) {
        if (!childNode.parents.some((p) => p.contactId === parent.contactId)) {
          childNode.parents.push(parent)
        }
      }
      walkDown(childId, generation + 1, depth + 1)
    }
  }

  walkUp(rootId, 0, 0)
  walkDown(rootId, 0, 0)

  for (const node of [...nodes.values()]) {
    for (const spouseId of index.spousesOf.get(node.contactId) ?? []) {
      if (!node.spouses.includes(spouseId)) node.spouses.push(spouseId)
      const spouseNode = ensureNode(nodes, spouseId, node.generation, contactMap)
      if (!spouseNode.spouses.includes(node.contactId)) {
        spouseNode.spouses.push(node.contactId)
      }
    }
  }

  const generations = new Map<number, string[]>()
  for (const node of nodes.values()) {
    const list = generations.get(node.generation) ?? []
    list.push(node.contactId)
    generations.set(node.generation, list)
  }

  for (const [, list] of generations) {
    list.sort((a, b) => {
      const nameA = contactMap.get(a)?.name ?? a
      const nameB = contactMap.get(b)?.name ?? b
      return nameA.localeCompare(nameB, 'zh')
    })
  }

  return { rootId, nodes, generations }
}

export function listConnectedContactIds(rootId: string, kinships: Kinship[]): Set<string> {
  const connected = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const k of kinships) {
      const aIn = connected.has(k.fromId)
      const bIn = connected.has(k.toId)
      if (aIn !== bIn) {
        connected.add(k.fromId)
        connected.add(k.toId)
        changed = true
      }
    }
  }
  return connected
}

/** 所有出现在族谱关系中的联系人（父母/配偶边两端） */
export function listKinshipContactIds(kinships: Kinship[]): Set<string> {
  const ids = new Set<string>()
  for (const kinship of kinships) {
    ids.add(kinship.fromId)
    ids.add(kinship.toId)
  }
  return ids
}
