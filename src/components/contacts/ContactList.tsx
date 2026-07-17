import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { ContactCard } from './ContactCard'
import { AlphabetIndex } from './AlphabetIndex'
import { EmptyState } from '@/components/ui/EmptyState'
import { getIndexLetters, getNameIndexLetter } from '@/lib/name-index'
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

  const availableLetters = useMemo(
    () => getIndexLetters(new Set(grouped.map(([letter]) => letter))),
    [grouped],
  )

  const scrollToLetter = useCallback((letter: string) => {
    const root = scrollRef.current
    const target = document.getElementById(`contact-index-${letter}`)
    if (!root || !target) return

    const rootRect = root.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const nextTop = root.scrollTop + (targetRect.top - rootRect.top) - 4
    root.scrollTo({ top: nextTop, behavior: 'smooth' })
    setActiveLetter(letter)
  }, [])

  useEffect(() => {
    const root = scrollRef.current
    if (!root || grouped.length === 0) return

    const headers = grouped
      .map(([letter]) => document.getElementById(`contact-index-${letter}`))
      .filter((el): el is HTMLElement => el !== null)

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        const first = visible[0]?.target.getAttribute('data-letter')
        if (first) setActiveLetter(first)
      },
      {
        root,
        rootMargin: '-8% 0px -70% 0px',
        threshold: [0, 0.25, 1],
      },
    )

    for (const header of headers) {
      observer.observe(header)
    }

    return () => observer.disconnect()
  }, [grouped])

  return (
    <section className="panel contact-list-panel">
      <div className="contact-list-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索姓名、城市、公司、标签..."
          />
        </div>

        {tags.length > 0 && (
          <div className="tag-filter-row">
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
                className={`filter-chip ${selectedTag === tag ? 'filter-chip-active' : ''}`}
                onClick={() => onTagChange(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="empty-state">
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
            <div className="contact-groups">
              {grouped.map(([letter, items]) => (
                <div key={letter} className="contact-group">
                  <div
                    id={`contact-index-${letter}`}
                    data-letter={letter}
                    className="group-letter"
                  >
                    {letter}
                  </div>
                  <div className="group-list">
                    {items.map((contact) => (
                      <ContactCard
                        key={contact.id}
                        contact={contact}
                        selectionMode={selectionMode}
                        selected={selectedIds?.has(contact.id) ?? false}
                        onToggleSelect={onToggleSelect}
                      />
                    ))}
                  </div>
                </div>
              ))}
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
