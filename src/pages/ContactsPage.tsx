import { Link } from 'react-router-dom'
import { CheckSquare, Plus, Sparkles, X, Upload } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BatchBar, ContactList, MergePanel, QuickActions } from '@/components/contacts'
import { PageHeader } from '@/components/ui'
import { useContacts } from '@/context/ContactsContext'
import { dismissDemoHint, shouldShowDemoHint } from '@/lib/seed-demo-data'

export function ContactsPage() {
  const {
    filteredContacts,
    duplicateGroups,
    contacts,
    loading,
    search,
    setSearch,
    tags,
    selectedTag,
    setSelectedTag,
    mergeGroup,
    removeContacts,
    addTagsToContacts,
    removeTagFromContacts,
  } = useContacts()

  const [showDemoHint, setShowDemoHint] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])

  useEffect(() => {
    if (shouldShowDemoHint()) {
      setShowDemoHint(true)
    }
  }, [])

  useEffect(() => {
    if (!selectionMode) return
    const visible = new Set(filteredContacts.map((contact) => contact.id))
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)))
  }, [filteredContacts, selectionMode])

  const exitSelection = () => {
    setSelectionMode(false)
    setSelectedIds([])
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  const toggleAllVisible = () => {
    setSelectedIds(filteredContacts.map((contact) => contact.id))
  }

  const runBusy = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } finally {
      setBusy(false)
    }
  }

  const description =
    contacts.length === 0
      ? '导入或新建联系人，补充籍贯与现居地后可在地图查看分布。'
      : `共 ${contacts.length} 人`

  return (
    <div
      className={`page-stack page-stack-contacts ${selectionMode ? 'page-stack-batch' : ''}`}
    >
      <PageHeader
        title="通讯录"
        description={description}
        actions={
          selectionMode ? (
            <button type="button" className="button-secondary" onClick={exitSelection}>
              取消选择
            </button>
          ) : (
            <div className="button-row">
              {contacts.length > 0 && (
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setSelectionMode(true)}
                >
                  <CheckSquare size={16} />
                  管理
                </button>
              )}
              <Link to="/import" className="button-secondary">
                <Upload size={16} />
                导入
              </Link>
              <Link to="/contacts/new" className="button-primary">
                <Plus size={16} />
                新建
              </Link>
            </div>
          )
        }
      />

      {showDemoHint && (
        <div className="demo-hint-banner">
          <div className="demo-hint-content">
            <Sparkles size={18} />
            <div>
              <strong>已导入示例数据</strong>
              <p>可在地图查看分布，或打开「族谱」看家庭关系；真实通讯录点右上角导入。</p>
            </div>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="关闭提示"
            onClick={() => {
              dismissDemoHint()
              setShowDemoHint(false)
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {!loading && !selectionMode && contacts.length <= 2 && <QuickActions />}

      <ContactList
        contacts={filteredContacts}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        tags={tags}
        selectedTag={selectedTag}
        onTagChange={setSelectedTag}
        selectionMode={selectionMode}
        selectedIds={selectedIdSet}
        onToggleSelect={toggleSelect}
      />

      {!selectionMode && (
        <MergePanel groups={duplicateGroups} contacts={contacts} onMerge={mergeGroup} />
      )}

      {selectionMode && (
        <BatchBar
          selectedIds={selectedIds}
          visibleContacts={filteredContacts}
          allTags={tags}
          busy={busy}
          onToggleAll={toggleAllVisible}
          onClear={() => setSelectedIds([])}
          onExit={exitSelection}
          onDelete={async (ids) => {
            await runBusy(async () => {
              await removeContacts(ids)
            })
          }}
          onAddTags={async (ids, nextTags) => {
            await runBusy(async () => {
              await addTagsToContacts(ids, nextTags)
            })
          }}
          onRemoveTag={async (ids, tag) => {
            await runBusy(async () => {
              await removeTagFromContacts(ids, tag)
            })
          }}
        />
      )}
    </div>
  )
}
