import { useContacts } from '@/context/ContactsContext'
import { ImportPanel } from '@/components/import'
import { PageHeader } from '@/components/ui'

export function ImportPage() {
  const { importContacts } = useContacts()

  return (
    <div className="page-stack">
      <PageHeader
        title="导入"
        description="从手机通讯录、表格或备份文件导入联系人。"
      />
      <ImportPanel onImport={importContacts} />
    </div>
  )
}
