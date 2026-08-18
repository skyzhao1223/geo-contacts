import { useEffect, useState } from 'react'
import { Bell, Download, Sparkles } from 'lucide-react'
import { exportCsv, exportJsonBackup, exportVCard } from '@/lib/contacts/export'
import { forceSeedDemoData } from '@/lib/demo/seed-demo-data'
import { useContacts } from '@/context/ContactsContext'
import { useAuth } from '@/context/AuthContext'
import { PageHeader } from '@/components/ui'
import { api } from '@/lib/api'
import {
  disablePushNotifications,
  enablePushNotifications,
  hasActivePushSubscription,
  isIosDevice,
  isStandaloneDisplay,
  pushSupported,
} from '@/lib/push'

export function SettingsPage() {
  const { user, refreshUser } = useAuth()
  const { contacts, resetAll, refresh } = useContacts()
  const [message, setMessage] = useState('')
  const [pushConfigured, setPushConfigured] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )
  const [showPreview, setShowPreview] = useState(user?.pushShowPreview !== false)

  useEffect(() => {
    setShowPreview(user?.pushShowPreview !== false)
  }, [user?.pushShowPreview])

  useEffect(() => {
    if (!user) return
    void api
      .pushStatus()
      .then((s) => {
        setPushConfigured(s.configured)
        setShowPreview(s.pushShowPreview)
      })
      .catch(() => setPushConfigured(false))
    void hasActivePushSubscription().then(setSubscribed)
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [user?.id])

  return (
    <div className="page-stack">
      <PageHeader
        title="设置"
        description="备份导出、通知、示例数据与本地数据管理。"
      />

      <section className="panel">
        <div className="settings-grid">
          <div className="info-card">
            <h3>安装应用</h3>
            <p>
              安装为 PWA 后可全屏使用；在 iPhone / iPad 上需先「添加到主屏幕」才能开启推送通知。
            </p>
            {isIosDevice() ? (
              <p className="text-sm opacity-80">
                Safari → 分享 → 添加到主屏幕 → 从桌面图标打开
                {isStandaloneDisplay() ? '（当前已是独立模式）' : '（当前还在浏览器标签中）'}。
              </p>
            ) : (
              <p className="text-sm opacity-80">
                桌面 Chrome / Edge 可在地址栏使用「安装」；Android Chrome 可用「添加到主屏幕」。
              </p>
            )}
            <div className="button-row">
              <span className="button-secondary" style={{ pointerEvents: 'none' }}>
                <Download size={16} />
                {isStandaloneDisplay() ? '已安装 / 独立模式' : '按系统提示安装'}
              </span>
            </div>
          </div>

          <div className="info-card">
            <h3>消息通知</h3>
            <p>
              关闭页面后仍可收到私信与好友请求摘要。中国大陆 Android 上的 Chrome / Edge 因网络限制可能收不到
              Web Push；App 打开时仍走实时连接。
            </p>
            {!pushSupported() && (
              <p className="text-sm opacity-80">当前浏览器不支持 Web Push。</p>
            )}
            {pushSupported() && !pushConfigured && (
              <p className="text-sm opacity-80">服务器尚未配置 VAPID，推送暂不可用。</p>
            )}
            <div className="button-row">
              <button
                type="button"
                className="button-secondary"
                disabled={pushBusy || !user || !pushSupported() || !pushConfigured}
                onClick={() => {
                  setPushBusy(true)
                  void enablePushNotifications()
                    .then((result) => {
                      setPermission(
                        typeof Notification !== 'undefined'
                          ? Notification.permission
                          : 'default',
                      )
                      void hasActivePushSubscription().then(setSubscribed)
                      if (result === 'ok') setMessage('已开启消息通知')
                      else if (result === 'need_install') {
                        setMessage('请先将本应用添加到主屏幕，再开启通知')
                      } else if (result === 'denied') setMessage('通知权限被拒绝')
                      else if (result === 'unavailable') setMessage('推送暂不可用')
                      else setMessage('当前环境不支持推送')
                    })
                    .finally(() => setPushBusy(false))
                }}
              >
                <Bell size={16} />
                开启通知
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={pushBusy || !user}
                onClick={() => {
                  setPushBusy(true)
                  void disablePushNotifications()
                    .then(() => {
                      setPermission(
                        typeof Notification !== 'undefined'
                          ? Notification.permission
                          : 'default',
                      )
                      setSubscribed(false)
                      setMessage('已关闭本机推送订阅')
                    })
                    .finally(() => setPushBusy(false))
                }}
              >
                关闭通知
              </button>
            </div>
            <p className="text-sm opacity-80">
              权限：{permission} · 订阅：{subscribed ? '已开启' : '未订阅'}
            </p>
            <label className="flex items-center gap-2 mt-2 text-sm">
              <input
                type="checkbox"
                checked={showPreview}
                disabled={!user}
                onChange={(e) => {
                  const next = e.target.checked
                  setShowPreview(next)
                  void api
                    .updatePushPreferences(next)
                    .then(() => refreshUser())
                    .then(() => setMessage(next ? '通知将显示消息摘要' : '通知仅显示「新消息」'))
                    .catch(() => setMessage('保存偏好失败'))
                }}
              />
              通知中显示消息预览
            </label>
          </div>

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
                  void refresh({ silent: true })
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
            <p>当前使用 OpenStreetMap + Nominatim 地理编码。高德地图尚未接入，暂不可切换。</p>
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
