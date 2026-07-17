import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Contact } from '@/types/contact'
import { Avatar } from '@/components/ui/Avatar'

interface PersonPickerProps {
  contacts: Contact[]
  excludeIds?: string[]
  placeholder?: string
  onSelect: (contact: Contact) => void
}

export function PersonPicker({
  contacts,
  excludeIds = [],
  placeholder = '搜索联系人…',
  onSelect,
}: PersonPickerProps) {
  const [query, setQuery] = useState('')
  const exclude = useMemo(() => new Set(excludeIds), [excludeIds])

  const results = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return contacts
      .filter((c) => !exclude.has(c.id))
      .filter((c) => {
        if (!keyword) return true
        return (
          c.name.toLowerCase().includes(keyword) ||
          c.phones.some((p) => p.includes(keyword)) ||
          (c.company?.toLowerCase().includes(keyword) ?? false)
        )
      })
      .slice(0, 12)
  }, [contacts, exclude, query])

  return (
    <div className="person-picker">
      <label className="person-picker-field">
        <Search size={15} aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
        />
      </label>
      {query.trim() && (
        <ul className="person-picker-list">
          {results.length === 0 ? (
            <li className="person-picker-empty">无匹配联系人</li>
          ) : (
            results.map((contact) => (
              <li key={contact.id}>
                <button
                  type="button"
                  className="person-picker-item"
                  onClick={() => {
                    onSelect(contact)
                    setQuery('')
                  }}
                >
                  <Avatar name={contact.name} src={contact.avatar} size="sm" />
                  <span className="person-picker-item-text">
                    <strong>{contact.name}</strong>
                    {contact.company && <em>{contact.company}</em>}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
