import { describe, expect, it } from 'vitest'
import {
  buildFamilyTree,
  buildKinshipIndex,
  getChildren,
  getParents,
  getSpouses,
  listKinshipContactIds,
} from './family-tree'
import type { Contact } from '../../types/contact'
import type { Kinship } from '../../types/kinship'

function contact(id: string, name: string): Contact {
  return {
    id,
    name,
    phones: [],
    emails: [],
    tags: [],
    createdAt: 1,
    updatedAt: 1,
  }
}

const kinships: Kinship[] = [
  { id: 'k1', fromId: 'child', toId: 'father', type: 'parent', role: 'father', createdAt: 1 },
  { id: 'k2', fromId: 'child', toId: 'mother', type: 'parent', role: 'mother', createdAt: 1 },
  { id: 'k3', fromId: 'father', toId: 'mother', type: 'spouse', createdAt: 1 },
  { id: 'k4', fromId: 'grandchild', toId: 'child', type: 'parent', role: 'parent', createdAt: 1 },
]

describe('family-tree helpers', () => {
  it('resolves parents, children and spouses', () => {
    expect(getParents(kinships, 'child')).toEqual([
      { contactId: 'father', role: 'father' },
      { contactId: 'mother', role: 'mother' },
    ])
    expect(getChildren(kinships, 'child')).toEqual(['grandchild'])
    expect(getSpouses(kinships, 'father').sort()).toEqual(['mother'])
  })

  it('lists all kinship participant ids', () => {
    expect([...listKinshipContactIds(kinships)].sort()).toEqual([
      'child',
      'father',
      'grandchild',
      'mother',
    ])
  })

  it('builds a kinship adjacency index in one pass', () => {
    const index = buildKinshipIndex(kinships)
    expect(index.parentsOf.get('child')).toEqual([
      { contactId: 'father', role: 'father' },
      { contactId: 'mother', role: 'mother' },
    ])
    expect(index.childrenOf.get('child')).toEqual(['grandchild'])
    expect(index.spousesOf.get('father')).toEqual(['mother'])
  })

  it('builds a centered family tree with generations', () => {
    const contacts = [
      contact('father', '父'),
      contact('mother', '母'),
      contact('child', '子'),
      contact('grandchild', '孙'),
    ]
    const tree = buildFamilyTree('child', kinships, contacts)

    expect(tree.rootId).toBe('child')
    expect(tree.nodes.get('child')?.generation).toBe(0)
    expect(tree.nodes.get('father')?.generation).toBe(-1)
    expect(tree.nodes.get('mother')?.generation).toBe(-1)
    expect(tree.nodes.get('grandchild')?.generation).toBe(1)
    expect(tree.nodes.get('father')?.spouses).toContain('mother')
  })
})
