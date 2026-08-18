import type { Contact } from '../../types/contact'
import { createEmptyContact } from '../../types/contact'

function decodeVCardValue(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
    .trim()
}

function getVCardFieldValue(line: string): string {
  const colonIndex = line.indexOf(':')
  if (colonIndex === -1) return ''
  return decodeVCardValue(line.slice(colonIndex + 1))
}

function parseAddress(line: string) {
  const value = getVCardFieldValue(line)
  const parts = value.split(';')
  // vCard ADR: PO Box; Extended; Street; City; Region; Postal; Country
  const [, , street, city, region, , country] = parts
  return {
    country: country || undefined,
    province: region || undefined,
    city: city || undefined,
    address: street || undefined,
  }
}

export function parseVCardFile(text: string, source = 'vCard'): Contact[] {
  const blocks = text.split(/BEGIN:VCARD/i).filter((block) => block.trim())
  const contacts: Contact[] = []

  for (const block of blocks) {
    const lines = block.split(/\r?\n/).reduce<string[]>((acc, line) => {
      if (line.startsWith(' ') && acc.length > 0) {
        acc[acc.length - 1] += line.slice(1)
      } else {
        acc.push(line)
      }
      return acc
    }, [])

    const contact = createEmptyContact({ source })
    let structuredName = ''

    for (const line of lines) {
      const upper = line.toUpperCase()
      if (upper.startsWith('FN')) {
        contact.name = getVCardFieldValue(line)
      } else if (upper.startsWith('N;') || upper.startsWith('N:')) {
        structuredName = getVCardFieldValue(line)
      } else if (upper.startsWith('TEL')) {
        const phone = getVCardFieldValue(line)
        if (phone) contact.phones.push(phone)
      } else if (upper.startsWith('EMAIL')) {
        const email = getVCardFieldValue(line)
        if (email) contact.emails.push(email)
      } else if (upper.startsWith('ORG')) {
        contact.company = getVCardFieldValue(line)
      } else if (upper.startsWith('TITLE')) {
        contact.title = getVCardFieldValue(line)
      } else if (upper.startsWith('BDAY')) {
        contact.birthday = getVCardFieldValue(line)
      } else if (upper.startsWith('NOTE')) {
        contact.notes = getVCardFieldValue(line)
      } else if (upper.startsWith('ADR')) {
        contact.currentLocation = parseAddress(line)
      } else if (upper.startsWith('CATEGORIES')) {
        contact.tags = getVCardFieldValue(line)
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      }
    }

    if (!contact.name && structuredName) {
      const [family, given] = structuredName.split(';')
      contact.name = `${family ?? ''}${given ?? ''}`.trim()
    }

    if (contact.name.trim()) {
      contacts.push(contact)
    }
  }

  return contacts
}

export function exportContactsToVCard(contacts: Contact[]): string {
  const cards = contacts.map((contact) => {
    const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${contact.name}`]
    for (const phone of contact.phones) {
      lines.push(`TEL;TYPE=CELL:${phone}`)
    }
    for (const email of contact.emails) {
      lines.push(`EMAIL:${email}`)
    }
    if (contact.company) lines.push(`ORG:${contact.company}`)
    if (contact.title) lines.push(`TITLE:${contact.title}`)
    if (contact.birthday) lines.push(`BDAY:${contact.birthday}`)
    if (contact.notes) lines.push(`NOTE:${contact.notes}`)
    if (contact.currentLocation) {
      const loc = contact.currentLocation
      lines.push(
        `ADR;TYPE=HOME:;;${loc.address ?? ''};${loc.city ?? ''};${loc.province ?? ''};;${loc.country ?? ''}`,
      )
    }
    if (contact.tags.length > 0) {
      lines.push(`CATEGORIES:${contact.tags.join(',')}`)
    }
    lines.push('END:VCARD')
    return lines.join('\r\n')
  })

  return cards.join('\r\n')
}
