import type { Contact, Location } from '@/types/contact'
import { locationToText } from '@/types/contact'
import type { Kinship, ParentRole } from '@/types/kinship'
import { getParents } from '@/lib/family/family-tree'

export interface HometownInference {
  location: Location
  sourceContactId: string
  sourceName: string
  path: Array<{ contactId: string; name: string; role: ParentRole }>
  label: string
}

function hasHometown(location?: Location): boolean {
  if (!location) return false
  return Boolean(locationToText(location).trim())
}

function preferParents(
  parents: Array<{ contactId: string; role: ParentRole }>,
): Array<{ contactId: string; role: ParentRole }> {
  const father = parents.find((p) => p.role === 'father')
  const mother = parents.find((p) => p.role === 'mother')
  const rest = parents.filter((p) => p.role !== 'father' && p.role !== 'mother')
  const ordered: Array<{ contactId: string; role: ParentRole }> = []
  if (father) ordered.push(father)
  if (mother) ordered.push(mother)
  ordered.push(...rest)
  return ordered
}

/**
 * 本人籍贯为空时，优先沿父亲上溯，否则母亲，最多 maxDepth 代。
 */
export function inferHometown(
  contactId: string,
  contacts: Contact[],
  kinships: Kinship[],
  maxDepth = 5,
): HometownInference | null {
  const contactMap = new Map(contacts.map((c) => [c.id, c]))
  const self = contactMap.get(contactId)
  if (!self || hasHometown(self.hometown)) return null

  type Frame = {
    contactId: string
    depth: number
    path: Array<{ contactId: string; name: string; role: ParentRole }>
  }

  const queue: Frame[] = [{ contactId, depth: 0, path: [] }]
  const visited = new Set<string>([contactId])

  while (queue.length > 0) {
    const frame = queue.shift()!
    if (frame.depth >= maxDepth) continue

    const parents = preferParents(getParents(kinships, frame.contactId))
    for (const parent of parents) {
      if (visited.has(parent.contactId)) continue
      visited.add(parent.contactId)

      const parentContact = contactMap.get(parent.contactId)
      const name = parentContact?.name ?? '未知'
      const nextPath = [
        ...frame.path,
        { contactId: parent.contactId, name, role: parent.role },
      ]

      if (parentContact && hasHometown(parentContact.hometown)) {
        const roleLabel =
          parent.role === 'father' ? '父亲' : parent.role === 'mother' ? '母亲' : '父母'
        return {
          location: parentContact.hometown!,
          sourceContactId: parent.contactId,
          sourceName: name,
          path: nextPath,
          label: `推断自：${name}（${roleLabel}）`,
        }
      }

      queue.push({
        contactId: parent.contactId,
        depth: frame.depth + 1,
        path: nextPath,
      })
    }
  }

  return null
}
