import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { exportCsv, exportJsonBackup, exportVCard } from '@/lib/export'
import { forceSeedDemoData } from '@/lib/seed-demo-data'
import { useContacts } from '@/context/ContactsContext'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/ui'

export function SettingsPage() {
  const { user } = useAuth()
  const { contacts, resetAll, refresh } = useContacts()
  const [message, setMessage] = useState('')

  return (
    <div className="page-stack">
      <PageHeader
        title="设置"
        description="备份导出、示例数据与本地数据管理。"
      />

      <section className="panel">
        <div className="settings-grid">
          <div className="info-card">
            <h3>导出备份</h3>
            <p>建议定期导出 JSON 备份，CSV / vCard 可与其他软件互通。</p>
            <div className="button-row">
              <button type="button" className="button-secondary" onClick={() => exportJsonBackup(contacts)}>
                导出 JSON
              </button>
              <button type="button" className="button-secondary" onClick={() => exportCsv(contacts)}>
                导出 CSV
              </button>
              <button type="button" className="button-secondary" onClick={() => exportVCard(contacts)}>
                导出 vCard
              </button>
            </div>
          </div>

          <div className="info-card">
            <h3>示例数据</h3>
            <p>老用户登录后若本地为空会自动补充；也可手动导入示例联系人体验功能。</p>
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                if (!user) return
                void forceSeedDemoData(user.id, user.displayName).then((count) => {
                  void refresh()
                  setMessage(`已导入 ${count} 位示例联系人`)
                })
              }}
            >
              <Sparkles size={16} />
              导入示例数据
            </button>
          </div>

          <div className="info-card">
            <h3>地图服务</h3>
            <p>当前使用 OpenStreetMap，后续可切换高德地图。</p>
          </div>

          <div className="info-card danger-card">
            <h3>清空数据</h3>
            <p>这会删除本机所有联系人，请先导出备份。</p>
            <button
              type="button"
              className="button-danger"
              onClick={() => {
                if (window.confirm('确定清空所有联系人吗？此操作不可恢复。')) {
                  void resetAll()
                }
              }}
            >
              清空全部联系人
            </button>
          </div>
        </div>

        {message && <div className="status-banner">{message}</div>}
      </section>
    </div>
  )
}
