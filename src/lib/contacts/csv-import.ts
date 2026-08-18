import Papa from 'papaparse'
import type { Contact, CsvColumnMapping } from '../../types/contact'
import { createEmptyContact, locationToText, parseLocationText } from '../../types/contact'

const COLUMN_ALIASES: Record<keyof CsvColumnMapping, string[]> = {
  name: ['name', '姓名', '名字', '联系人', 'display name', 'full name'],
  phone: ['phone', 'mobile', 'tel', '电话', '手机', '手机号'],
  email: ['email', 'mail', '邮箱', '电子邮件'],
  company: ['company', 'org', 'organization', '公司', '单位'],
  birthplace: ['birthplace', 'birth place', '出生地', '出生城市'],
  hometown: ['hometown', 'native place', '籍贯', '祖籍', '家乡'],
  currentLocation: ['current', 'location', 'address', 'city', '现居地', '居住地', '地址', '城市'],
  tags: ['tags', 'label', 'group', '标签', '分组'],
  notes: ['notes', 'remark', '备注', '说明'],
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase()
}

export function guessCsvMapping(headers: string[]): CsvColumnMapping {
  const mapping: CsvColumnMapping = {}
  const normalized = headers.map(normalizeHeader)

  for (const [field, aliases] of Object.entries(COLUMN_ALIASES) as [
    keyof CsvColumnMapping,
    string[],
  ][]) {
    const index = normalized.findIndex((header) =>
      aliases.some((alias) => header === alias.toLowerCase() || header.includes(alias.toLowerCase())),
    )
    if (index >= 0) {
      mapping[field] = headers[index]
    }
  }

  return mapping
}

export function parseCsvFile(
  text: string,
  mapping: CsvColumnMapping,
  source = 'CSV',
): Contact[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })

  return parsed.data
    .map((row) => {
      const get = (key?: string) => (key ? row[key]?.trim() ?? '' : '')
      const name = get(mapping.name)
      if (!name) return null

      const contact = createEmptyContact({
        name,
        source,
        company: get(mapping.company) || undefined,
        notes: get(mapping.notes) || undefined,
        phones: get(mapping.phone)
          .split(/[;；,，/|]/)
          .map((v) => v.trim())
          .filter(Boolean),
        emails: get(mapping.email)
          .split(/[;；,，/|]/)
          .map((v) => v.trim())
          .filter(Boolean),
        tags: get(mapping.tags)
          .split(/[;；,，/|]/)
          .map((v) => v.trim())
          .filter(Boolean),
      })

      const birthplace = get(mapping.birthplace)
      const hometown = get(mapping.hometown)
      const currentLocation = get(mapping.currentLocation)

      if (birthplace) contact.birthplace = parseLocationText(birthplace)
      if (hometown) contact.hometown = parseLocationText(hometown)
      if (currentLocation) contact.currentLocation = parseLocationText(currentLocation)

      return contact
    })
    .filter((contact): contact is Contact => contact !== null)
}

export function exportContactsToCsv(contacts: Contact[]): string {
  const rows = contacts.map((contact) => ({
    姓名: contact.name,
    手机: contact.phones.join(';'),
    邮箱: contact.emails.join(';'),
    公司: contact.company ?? '',
    出生地: locationToText(contact.birthplace),
    籍贯: locationToText(contact.hometown),
    现居地: locationToText(contact.currentLocation),
    标签: contact.tags.join(';'),
    备注: contact.notes ?? '',
  }))

  return Papa.unparse(rows)
}

export function readCsvHeaders(text: string): string[] {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    preview: 1,
  })
  return parsed.meta.fields ?? []
}
