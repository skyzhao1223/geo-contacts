import { memo } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import type { Contact } from '@/types/contact'
import { useLinkedOnline } from '@/context/PresenceContext'
import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'

interface ContactCardProps {
  contact: Contact
  selectionMode?: boolean
  selected?: boolean
  onToggleSelect?: (id: string) => void
}

function getSubtitle(contact: Contact): string {
  const city =
    contact.currentLocation?.city ||
    contact.hometown?.city ||
    contact.birthplace?.city
  if (city) return city
  if (contact.company) return contact.company
  if (contact.phones[0]) return contact.phones[0]
  if (contact.emails[0]) return contact.emails[0]
  return ''
}

export const ContactCard = memo(function ContactCard({
  contact,
  selectionMode = false,
  selected = false,
  onToggleSelect,
}: ContactCardProps) {
  const online = useLinkedOnline(contact.linkedUserId)
  const subtitle = getSubtitle(contact)

  const content = (
    <>
      {selectionMode && (
        <span
          className={`contact-check ${selected ? 'contact-check-on' : ''}`}
          aria-hidden
        >
          {selected ? <Check size={14} strokeWidth={3} /> : null}
        </span>
      )}
      <Avatar
        name={contact.name}
        src={contact.avatar}
        size="md"
        online={online}
      />
      <div className="contact-main">
        <div className="contact-name-row">
          <h3 className="contact-name">{contact.name}</h3>
          {online != null && <OnlineBadge online={online} compact />}
        </div>
        {subtitle && <p className="contact-meta">{subtitle}</p>}
      </div>
      {!selectionMode && <ChevronRight size={18} className="contact-chevron" />}
    </>
  )

  if (selectionMode) {
    return (
      <button
        type="button"
        className={`contact-card contact-card-select ${selected ? 'contact-card-selected' : ''}`}
        aria-pressed={selected}
        onClick={() => onToggleSelect?.(contact.id)}
      >
        {content}
      </button>
    )
  }

  return (
    <Link to={`/contacts/${contact.id}`} className="contact-card">
      {content}
    </Link>
  )
})
