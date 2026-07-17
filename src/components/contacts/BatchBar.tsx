import { useMemo, useState } from 'react'
import { CheckSquare, Download, Tag, Trash2, X, XCircle } from 'lucide-react'
import type { Contact } from '@/types/contact'
import { exportCsv, exportJsonBackup, exportVCard } from '@/lib/export'

type TagDialogMode = 'add' | 'remove' | null
type ExportFormat = 'vcard' | 'csv' | 'json'

interface BatchBarProps {
  selectedIds: string[]
  visibleContacts: Contact[]
  allTags: string[]
  busy?: boolean
  onToggleAll: () => void
  onClear: () => void
  onExit: () => void
  onDelete: (ids: string[]) => Promise<void>
  onAddTags: (ids: string[], tags: string[]) => Promise<void>
  onRemoveTag: (ids: string[], tag: string) => Promise<void>
}

export function BatchBar({
  selectedIds,
  visibleContacts,
  allTags,
  busy = false,
  onToggleAll,
  onClear,
  onExit,
  onDelete,
  onAddTags,
  onRemoveTag,
}: BatchBarProps) {
  const [tagMode, setTagMode] = useState<TagDialogMode>(null)
  const [tagInput, setTagInput] = useState('')
  const [exportOpen, setExportOpen] = useState(false)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const selectedContacts = useMemo(
    () => visibleContacts.filter((contact) => selectedSet.has(contact.id)),
    [visibleContacts, selectedSet],
  )
  const allSelected =
    visibleContacts.length > 0 && selectedIds.length === visibleContacts.length

  const removableTags = useMemo(() => {
    const set = new Set<string>()
    for (const contact of selectedContacts) {
      for (const tag of contact.tags) set.add(tag)
    }
    return [...set].sort()
  }, [selectedContacts])

  const count = selectedIds.length
  const disabled = count === 0 || busy

  const closeTagDialog = () => {
    setTagMode(null)
    setTagInput('')
  }

  const handleAddTag = async () => {
    const tags = tagInput
      .split(/[,，;；\s]+/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (tags.length === 0) return
    await onAddTags(selectedIds, tags)
    closeTagDialog()
  }

  const handleRemoveTag = async (tag: string) => {
    await onRemoveTag(selectedIds, tag)
    closeTagDialog()
  }

  const handleDelete = async () => {
    if (
      !window.confirm(
        `确定删除选中的 ${count} 位联系人吗？此操作不可恢复。`,
      )
    ) {
      return
    }
    await onDelete(selectedIds)
    onClear()
  }

  const handleExport = (format: ExportFormat) => {
    if (selectedContacts.length === 0) return
    if (format === 'json') exportJsonBackup(selectedContacts)
    else if (format === 'csv') exportCsv(selectedContacts)
    else exportVCard(selectedContacts)
    setExportOpen(false)
  }

  return (
    <>
      <div className="batch-bar" role="toolbar" aria-label="批量管理">
        <div className="batch-bar-top">
          <button type="button" className="button-ghost batch-bar-exit" onClick={onExit}>
            <X size={16} />
            完成
          </button>
          <strong className="batch-bar-count">已选 {count} 人</strong>
          <button
            type="button"
            className="button-ghost"
            onClick={allSelected ? onClear : onToggleAll}
            disabled={visibleContacts.length === 0 || busy}
          >
            <CheckSquare size={16} />
            {allSelected ? '取消全选' : '全选'}
          </button>
        </div>

        <div className="batch-bar-actions">
          <button
            type="button"
            className="button-secondary"
            disabled={disabled}
            onClick={() => {
              setExportOpen(false)
              setTagMode('add')
              setTagInput('')
            }}
          >
            <Tag size={16} />
            加标签
          </button>
          <button
            type="button"
            className="button-secondary"
            disabled={disabled || removableTags.length === 0}
            onClick={() => {
              setExportOpen(false)
              setTagMode('remove')
            }}
          >
            <XCircle size={16} />
            去标签
          </button>
          <div className="batch-export">
            <button
              type="button"
              className="button-secondary"
              disabled={disabled}
              onClick={() => {
                closeTagDialog()
                setExportOpen((open) => !open)
              }}
            >
              <Download size={16} />
              导出
            </button>
            {exportOpen && (
              <div className="batch-export-menu" role="menu">
                <button type="button" role="menuitem" onClick={() => handleExport('vcard')}>
                  vCard
                </button>
                <button type="button" role="menuitem" onClick={() => handleExport('csv')}>
                  CSV
                </button>
                <button type="button" role="menuitem" onClick={() => handleExport('json')}>
                  JSON
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className="button-danger"
            disabled={disabled}
            onClick={() => void handleDelete()}
          >
            <Trash2 size={16} />
            删除
          </button>
        </div>
      </div>

      {tagMode && (
        <div className="batch-dialog-backdrop" onClick={closeTagDialog}>
          <div
            className="batch-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={tagMode === 'add' ? '批量添加标签' : '批量移除标签'}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="batch-dialog-header">
              <strong>{tagMode === 'add' ? '添加标签' : '移除标签'}</strong>
              <button type="button" className="icon-button" onClick={closeTagDialog} aria-label="关闭">
                <X size={16} />
              </button>
            </div>

            {tagMode === 'add' ? (
              <>
                <p className="batch-dialog-hint">将为 {count} 人添加标签，多个标签可用逗号分隔。</p>
                <input
                  className="batch-dialog-input"
                  value={tagInput}
                  autoFocus
                  placeholder="例如：同学, 杭州"
                  onChange={(event) => setTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void handleAddTag()
                  }}
                />
                {allTags.length > 0 && (
                  <div className="tag-filter-row batch-dialog-tags">
                    {allTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="filter-chip"
                        onClick={() =>
                          setTagInput((prev) =>
                            prev.trim() ? `${prev.trim()}, ${tag}` : tag,
                          )
                        }
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className="batch-dialog-actions">
                  <button type="button" className="button-secondary" onClick={closeTagDialog}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="button-primary"
                    disabled={!tagInput.trim() || busy}
                    onClick={() => void handleAddTag()}
                  >
                    添加
                  </button>
                </div>
              </>
            ) : removableTags.length === 0 ? (
              <p className="batch-dialog-hint">选中联系人暂无标签可移除。</p>
            ) : (
              <>
                <p className="batch-dialog-hint">选择要从这 {count} 人中移除的标签：</p>
                <div className="tag-filter-row batch-dialog-tags">
                  {removableTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      className="filter-chip"
                      disabled={busy}
                      onClick={() => void handleRemoveTag(tag)}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
