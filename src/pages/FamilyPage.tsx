import { useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Network, PencilLine } from 'lucide-react'
import { useContacts } from '@/context/ContactsContext'
import { useKinships } from '@/context/KinshipsContext'
import { FamilyTreeView } from '@/components/family'
import { PageHeader, EmptyState } from '@/components/ui'
import { SAMPLE_FAMILY_IDS } from '@/data/sample-contacts'

export function FamilyPage() {
  const { contacts, loading: contactsLoading } = useContacts()
  const { kinships, loading: kinshipsLoading } = useKinships()
  const [params, setParams] = useSearchParams()

  const connectedIds = useMemo(() => {
    const ids = new Set<string>()
    for (const k of kinships) {
      ids.add(k.fromId)
      ids.add(k.toId)
    }
    return ids
  }, [kinships])

  const pickerContacts = useMemo(() => {
    const withFamily = contacts.filter((c) => connectedIds.has(c.id))
    const rest = contacts.filter((c) => !connectedIds.has(c.id))
    return [...withFamily, ...rest]
  }, [contacts, connectedIds])

  const defaultRootId = useMemo(() => {
    if (contacts.some((c) => c.id === SAMPLE_FAMILY_IDS.son)) {
      return SAMPLE_FAMILY_IDS.son
    }
    const firstConnected = pickerContacts.find((c) => connectedIds.has(c.id))
    return firstConnected?.id ?? contacts[0]?.id ?? null
  }, [contacts, pickerContacts, connectedIds])

  const rootId = params.get('root') ?? defaultRootId

  const rootContact = useMemo(
    () => contacts.find((c) => c.id === rootId) ?? null,
    [contacts, rootId],
  )

  const loading = contactsLoading || kinshipsLoading

  if (loading) {
    return <div className="empty-state">加载中...</div>
  }

  if (contacts.length === 0) {
    return (
      <div className="page-stack">
        <PageHeader title="族谱" description="以联系人为节点，梳理父母与配偶关系。" />
        <EmptyState
          icon={<Network size={24} />}
          title="还没有联系人"
          description="先导入或添加联系人，再在详情里标记家庭关系。"
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="族谱"
        description="以一位联系人为中心，按世代查看家庭关系。"
        compact
      />

      <section className="panel family-toolbar">
        <label className="family-root-select">
          <span>中心人物</span>
          <select
            value={rootId ?? ''}
            onChange={(event) => setParams({ root: event.target.value })}
          >
            {pickerContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {connectedIds.has(contact.id) ? `${contact.name} · 有关系` : contact.name}
              </option>
            ))}
          </select>
        </label>
        {rootContact && (
          <Link to={`/contacts/${rootContact.id}`} className="button-secondary family-edit-link">
            <PencilLine size={15} />
            编辑关系
          </Link>
        )}
      </section>

      {rootId && (
        <section className="panel family-tree-panel">
          <FamilyTreeView rootId={rootId} contacts={contacts} kinships={kinships} />
        </section>
      )}
    </div>
  )
}
