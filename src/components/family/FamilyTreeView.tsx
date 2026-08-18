import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { Heart, Users } from 'lucide-react'
import type { Contact } from '@/types/contact'
import { locationToText } from '@/types/contact'
import type { Kinship } from '@/types/kinship'
import { buildFamilyTree, type FamilyTree } from '@/lib/family/family-tree'
import { Avatar } from '@/components/ui/Avatar'
import { EmptyState } from '@/components/ui'

interface FamilyTreeViewProps {
  rootId: string
  contacts: Contact[]
  kinships: Kinship[]
}

const GENERATION_LABELS: Record<number, string> = {
  [-2]: '曾祖辈',
  [-1]: '父母辈',
  0: '本代',
  1: '子辈',
  2: '孙辈',
}

function generationLabel(gen: number): string {
  return GENERATION_LABELS[gen] ?? (gen < 0 ? `上${-gen}代` : `下${gen}代`)
}

type DisplayUnit =
  | { kind: 'couple'; leftId: string; rightId: string }
  | { kind: 'person'; id: string }

function orderCouple(
  a: string,
  b: string,
  tree: FamilyTree,
): { leftId: string; rightId: string } {
  if (a === tree.rootId) return { leftId: a, rightId: b }
  if (b === tree.rootId) return { leftId: b, rightId: a }

  for (const node of tree.nodes.values()) {
    const father = node.parents.find((p) => p.role === 'father')?.contactId
    const mother = node.parents.find((p) => p.role === 'mother')?.contactId
    if (father === a && mother === b) return { leftId: a, rightId: b }
    if (father === b && mother === a) return { leftId: b, rightId: a }
  }

  const nameA = tree.nodes.get(a)?.contact?.name ?? a
  const nameB = tree.nodes.get(b)?.contact?.name ?? b
  return nameA.localeCompare(nameB, 'zh') <= 0
    ? { leftId: a, rightId: b }
    : { leftId: b, rightId: a }
}

function unitsForGeneration(ids: string[], tree: FamilyTree): DisplayUnit[] {
  const idSet = new Set(ids)
  const used = new Set<string>()
  const units: DisplayUnit[] = []

  for (const id of ids) {
    if (used.has(id)) continue
    const partner = (tree.nodes.get(id)?.spouses ?? []).find(
      (sid) => idSet.has(sid) && !used.has(sid),
    )
    if (partner) {
      units.push({ kind: 'couple', ...orderCouple(id, partner, tree) })
      used.add(id)
      used.add(partner)
    } else {
      units.push({ kind: 'person', id })
      used.add(id)
    }
  }

  return units
}

function roleHint(contactId: string, tree: FamilyTree): string | null {
  if (contactId === tree.rootId) return '中心'
  const root = tree.nodes.get(tree.rootId)
  if (!root) return null
  if (root.parents.some((p) => p.contactId === contactId)) {
    const role = root.parents.find((p) => p.contactId === contactId)?.role
    if (role === 'father') return '父亲'
    if (role === 'mother') return '母亲'
    return '父母'
  }
  if (root.spouses.includes(contactId)) return '配偶'
  if (root.children.includes(contactId)) return '子女'
  return null
}

function PersonCard({
  contactId,
  tree,
  isRoot,
}: {
  contactId: string
  tree: FamilyTree
  isRoot: boolean
}) {
  const contact = tree.nodes.get(contactId)?.contact
  const hint = roleHint(contactId, tree)
  const hometown = locationToText(contact?.hometown)
  const meta = [hometown, contact?.company].filter(Boolean).join(' · ')

  return (
    <Link
      to={contact ? `/contacts/${contact.id}` : '#'}
      className={`family-node ${isRoot ? 'is-root' : ''} ${contact ? '' : 'is-unknown'}`}
      onClick={(event) => {
        if (!contact) event.preventDefault()
      }}
    >
      <div className="family-node-avatar-wrap">
        <Avatar name={contact?.name ?? '?'} src={contact?.avatar} size="lg" />
        {isRoot && <span className="family-node-root-dot" aria-hidden />}
      </div>
      <span className="family-node-name">{contact?.name ?? '未知'}</span>
      {hint && <span className={`family-node-role ${isRoot ? 'is-root' : ''}`}>{hint}</span>}
      {meta && <span className="family-node-meta">{meta}</span>}
    </Link>
  )
}

export function FamilyTreeView({ rootId, contacts, kinships }: FamilyTreeViewProps) {
  const tree = useMemo(
    () => buildFamilyTree(rootId, kinships, contacts),
    [rootId, kinships, contacts],
  )
  const sortedGens = useMemo(
    () => [...tree.generations.keys()].sort((a, b) => a - b),
    [tree],
  )

  const rootNode = tree.nodes.get(rootId)
  const hasRelations =
    (rootNode?.parents.length ?? 0) > 0 ||
    (rootNode?.spouses.length ?? 0) > 0 ||
    (rootNode?.children.length ?? 0) > 0 ||
    tree.nodes.size > 1

  if (!hasRelations) {
    return (
      <EmptyState
        icon={<Heart size={24} />}
        title="还没有家庭关系"
        description="在联系人详情中添加父母或配偶，族谱树会在这里展开。"
      />
    )
  }

  return (
    <div className="family-tree">
      <div className="family-tree-legend" aria-hidden>
        <Users size={14} />
        <span>{tree.nodes.size} 人 · {sortedGens.length} 代</span>
      </div>

      {sortedGens.map((gen, index) => {
        const ids = tree.generations.get(gen) ?? []
        const units = unitsForGeneration(ids, tree)
        return (
          <div key={gen} className="family-gen-block">
            {index > 0 && (
              <div className="family-gen-connector" aria-hidden>
                <span className="family-gen-connector-line" />
              </div>
            )}
            <div className="family-gen-band">
              <div className="family-gen-label">{generationLabel(gen)}</div>
              <div className="family-gen-row">
                {units.map((unit) =>
                  unit.kind === 'couple' ? (
                    <div
                      key={`${unit.leftId}-${unit.rightId}`}
                      className="family-couple"
                    >
                      <PersonCard
                        contactId={unit.leftId}
                        tree={tree}
                        isRoot={unit.leftId === rootId}
                      />
                      <span className="family-couple-link" aria-hidden>
                        <Heart size={12} fill="currentColor" />
                      </span>
                      <PersonCard
                        contactId={unit.rightId}
                        tree={tree}
                        isRoot={unit.rightId === rootId}
                      />
                    </div>
                  ) : (
                    <PersonCard
                      key={unit.id}
                      contactId={unit.id}
                      tree={tree}
                      isRoot={unit.id === rootId}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
