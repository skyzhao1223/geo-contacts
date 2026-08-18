import type { Contact } from '../../types/contact'
import { exportContactsToCsv } from './csv-import'
import { exportContactsToVCard } from './vcard'

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportJsonBackup(contacts: Contact[]) {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    contacts,
  }
  downloadFile(
    `geo-contacts-backup-${Date.now()}.json`,
    JSON.stringify(payload, null, 2),
    'application/json',
  )
}

export function exportCsv(contacts: Contact[]) {
  downloadFile(`geo-contacts-${Date.now()}.csv`, exportContactsToCsv(contacts), 'text/csv')
}

export function exportVCard(contacts: Contact[]) {
  downloadFile(`geo-contacts-${Date.now()}.vcf`, exportContactsToVCard(contacts), 'text/vcard')
}

export async function importJsonBackup(text: string): Promise<Contact[]> {
  const data = JSON.parse(text) as { contacts?: Contact[] }
  if (!Array.isArray(data.contacts)) {
    throw new Error('备份文件格式不正确')
  }
  return data.contacts
}
