import { useState } from 'react'
import { FileUp } from 'lucide-react'
import type { CsvColumnMapping, Contact } from '@/types/contact'
import { guessCsvMapping, parseCsvFile, readCsvHeaders } from '@/lib/csv-import'
import { parseVCardFile } from '@/lib/vcard'
import { importJsonBackup } from '@/lib/export'

interface ImportPanelProps {
  onImport: (contacts: Contact[]) => Promise<void>
}

async function readFile(file: File): Promise<string> {
  return file.text()
}

export function ImportPanel({ onImport }: ImportPanelProps) {
  const [message, setMessage] = useState('')
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvText, setCsvText] = useState('')
  const [mapping, setMapping] = useState<CsvColumnMapping>({})
  const [importing, setImporting] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setImporting(true)
    setMessage('')

    try {
      const imported: Contact[] = []

      for (const file of files) {
        const text = await readFile(file)
        const lower = file.name.toLowerCase()

        if (lower.endsWith('.vcf')) {
          imported.push(...parseVCardFile(text, `vCard:${file.name}`))
        } else if (lower.endsWith('.csv')) {
          setCsvText(text)
          const headers = readCsvHeaders(text)
          setCsvHeaders(headers)
          const guessed = guessCsvMapping(headers)
          setMapping(guessed)
          imported.push(...parseCsvFile(text, guessed, `CSV:${file.name}`))
        } else if (lower.endsWith('.json')) {
          imported.push(...(await importJsonBackup(text)))
        } else {
          throw new Error(`暂不支持的文件类型：${file.name}`)
        }
      }

      if (imported.length === 0) {
        setMessage('没有解析到有效联系人')
      } else {
        await onImport(imported)
        setMessage(`成功导入 ${imported.length} 位联系人`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const reimportCsv = async () => {
    if (!csvText) return
    setImporting(true)
    try {
      const imported = parseCsvFile(csvText, mapping, 'CSV:manual-mapping')
      await onImport(imported)
      setMessage(`按当前列映射重新导入 ${imported.length} 位联系人`)
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="panel">
      <label className="upload-card">
        <FileUp size={28} />
        <div>
          <strong>选择文件导入</strong>
          <p>手机通讯录可先导出 vCard；Excel / 飞书 / 邮箱联系人可导出 CSV</p>
        </div>
        <input
          type="file"
          accept=".vcf,.csv,.json,text/vcard,text/csv,application/json"
          multiple
          onChange={(event) => void handleFiles(event.target.files)}
        />
      </label>

      <div className="info-card">
        <h3>导入来源建议</h3>
        <ul className="tips-list">
          <li>iPhone：通讯录 → 选择联系人 → 共享联系人 → 导出 vCard</li>
          <li>Android：通讯录 → 设置 → 导入/导出 → 导出 .vcf</li>
          <li>Google / Outlook：联系人页面导出 CSV</li>
          <li>导入后可在「合并去重」中处理重复项，并补充籍贯/出生地</li>
        </ul>
      </div>

      {csvHeaders.length > 0 && (
        <div className="info-card">
          <h3>CSV 列映射</h3>
          <p>如果自动识别不准确，可手动调整后再导入。</p>
          <div className="mapping-grid">
            {(Object.keys(mapping) as (keyof CsvColumnMapping)[]).map((field) => (
              <label key={field} className="field">
                <span>{field}</span>
                <select
                  value={mapping[field] ?? ''}
                  onChange={(event) =>
                    setMapping((current) => ({
                      ...current,
                      [field]: event.target.value || undefined,
                    }))
                  }
                >
                  <option value="">未映射</option>
                  {csvHeaders.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button
            type="button"
            className="button-secondary"
            disabled={importing || !csvText}
            onClick={() => void reimportCsv()}
          >
            按映射重新导入 CSV
          </button>
        </div>
      )}

      {message && <div className="status-banner">{message}</div>}
    </section>
  )
}
