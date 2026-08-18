import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Search, Users } from 'lucide-react'
import { ContactCard } from './ContactCard'
import { AlphabetIndex } from './AlphabetIndex'
import { EmptyState } from '@/components/ui/EmptyState'
import { getIndexLetters, getNameIndexLetter } from '@/lib/contacts/name-index'
import { SYSTEM_FAMILY_TAG } from '@/lib/family/system-tags'
import type { Contact } from '@/types/contact'

interface ContactListProps {
  contacts: Contact[]
  loading: boolean
  search: string
  onSearchChange: (value: string) => void
  tags: string[]
  selectedTag: string | null
  onTagChange: (tag: string | null) => void
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (id: string) => void
}

type FlatRow =
  | { type: 'header'; letter: string; key: string }
  | { type: 'contact'; contact: Contact; letter: string; key: string }

const HEADER_HEIGHT = 36
const CONTACT_HEIGHT = 76

export function ContactList({
  contacts,
  loading,
  search,
  onSearchChange,
  tags,
  selectedTag,
  onTagChange,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
}: ContactListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeLetter, setActiveLetter] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, Contact[]>()
    for (const contact of contacts) {
      const key = getNameIndexLetter(contact.name)
      const list = map.get(key) ?? []
      list.push(contact)
      map.set(key, list)
    }

    for (const [, list] of map) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    }

    return [...map.entries()].sort(([a], [b]) => {
      if (a === '#') return 1
      if (b === '#') return -1
      return a.localeCompare(b)
    })
  }, [contacts])

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = []
    for (const [letter, items] of grouped) {
      rows.push({ type: 'header', letter, key: `h-${letter}` })
      for (const contact of items) {
        rows.push({
          type: 'contact',
          contact,
          letter,
          key: contact.id,
        })
      }
    }
    return rows
  }, [grouped])

  const letterOffsets = useMemo(() => {
    const map = new Map<string, number>()
    let offset = 0
    for (const row of flatRows) {
      if (row.type === 'header') {
        map.set(row.letter, offset)
        offset += HEADER_HEIGHT
      } else {
        offset += CONTACT_HEIGHT
      }
    }
    return map
  }, [flatRows])

  const availableLetters = useMemo(
    () => getIndexLetters(new Set(grouped.map(([letter]) => letter))),
    [grouped],
  )

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) =>
      flatRows[index]?.type === 'header' ? HEADER_HEIGHT : CONTACT_HEIGHT,
    overscan: 8,
  })

  const scrollToLetter = useCallback(
    (letter: string) => {
      const offset = letterOffsets.get(letter)
      const root = scrollRef.current
      if (offset == null || !root) return
      root.scrollTo({ top: offset, behavior: 'smooth' })
      setActiveLetter(letter)
    },
    [letterOffsets],
  )

  useEffect(() => {
    const root = scrollRef.current
    if (!root || flatRows.length === 0) return

    const onScroll = () => {
      const scrollTop = root.scrollTop
      let current: string | null = null
      for (const [letter, offset] of letterOffsets) {
        if (offset <= scrollTop + 8) current = letter
        else break
      }
      if (current) setActiveLetter(current)
    }

    onScroll()
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => root.removeEventListener('scroll', onScroll)
  }, [flatRows.length, letterOffsets])

  return (
    <section className="panel contact-list-panel">
      <div className="contact-list-toolbar">
        <div className="search-box">
          <Search size={18} aria-hidden />
          <label className="sr-only" htmlFor="contact-search">
            搜索联系人
          </label>
          <input
            id="contact-search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索姓名、城市、公司、标签..."
            aria-label="搜索联系人"
          />
        </div>

        {tags.length > 0 && (
          <div className="tag-filter-row" role="group" aria-label="按标签筛选">
            <button
              type="button"
              className={`filter-chip ${selectedTag === null ? 'filter-chip-active' : ''}`}
              onClick={() => onTagChange(null)}
            >
              全部
            </button>
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={`filter-chip ${tag === SYSTEM_FAMILY_TAG ? 'filter-chip-system' : ''} ${selectedTag === tag ? 'filter-chip-active' : ''}`}
                onClick={() => onTagChange(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state" role="status" aria-label="加载中">
          <div className="loading-spinner" />
        </div>
      ) : contacts.length === 0 ? (
        search.trim() || selectedTag ? (
          <EmptyState
            icon={<Users size={24} />}
            title="没有匹配的联系人"
            description="试试清空搜索，或切换标签筛选。"
          />
        ) : (
          <EmptyState
            icon={<Users size={24} />}
            title="还没有联系人"
            description="先导入手机通讯录，或从示例数据开始体验地图分布。"
            action={{ label: '去导入', to: '/import' }}
            secondaryAction={{ label: '查看地图', to: '/map' }}
          />
        )
      ) : (
        <div className="contact-list-main">
          <div ref={scrollRef} className="contact-list-scroll">
            <div
              className="contact-groups contact-groups-virtual"
              style={{
                height: virtualizer.getTotalSize(),
                position: 'relative',
                width: '100%',
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const row = flatRows[virtualRow.index]
                if (!row) return null

                return (
                  <div
                    key={row.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    className={
                      row.type === 'header' ? 'contact-group-virtual-header' : 'contact-group-virtual-item'
                    }
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {row.type === 'header' ? (
                      <div
                        id={`contact-index-${row.letter}`}
                        data-letter={row.letter}
                        className="group-letter"
                      >
                        {row.letter}
                      </div>
                    ) : (
                      <ContactCard
                        contact={row.contact}
                        selectionMode={selectionMode}
                        selected={selectedIds?.has(row.contact.id) ?? false}
                        onToggleSelect={onToggleSelect}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <AlphabetIndex
            letters={availableLetters}
            activeLetter={activeLetter ?? availableLetters[0] ?? null}
            onSelect={scrollToLetter}
          />
        </div>
      )}
    </section>
  )
}
