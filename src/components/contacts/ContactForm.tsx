import { useMemo, useState, type ReactNode } from 'react'
import { Save, Trash2, User, Briefcase, MapPin, Tag, Heart, Sparkles } from 'lucide-react'
import type { Contact, Location } from '@/types/contact'
import { createEmptyContact, locationToText, parseLocationText } from '@/types/contact'
import { usePresenceState } from '@/context/PresenceContext'
import { useContacts } from '@/context/ContactsContext'
import { useKinships } from '@/context/KinshipsContext'
import { getLinkedLastSeen, getLinkedOnline } from '@/lib/presence'
import { inferHometown } from '@/lib/hometown-infer'
import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'
import { KinshipEditor } from '@/components/family'

interface ContactFormProps {
  initial?: Contact
  onSave: (contact: Contact) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

function FormSection({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="form-section">
      <div className="form-section-header">
        <div className="form-section-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
      </div>
      <div className="form-section-body">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {hint && <em className="field-hint">{hint}</em>}
      </span>
      {children}
    </label>
  )
}

function LocationFields({
  label,
  value,
  onChange,
}: {
  label: string
  value?: Location
  onChange: (value?: Location) => void
}) {
  return (
    <Field label={label} hint="全球地址，支持城市 / 国家">
      <input
        value={locationToText(value)}
        onChange={(event) => {
          const next = event.target.value
          onChange(next ? parseLocationText(next) : undefined)
        }}
        placeholder="例如：东京, 日本 或 浙江 杭州 西湖区"
      />
    </Field>
  )
}

export function ContactForm({ initial, onSave, onDelete }: ContactFormProps) {
  const [contact, setContact] = useState<Contact>(initial ?? createEmptyContact())
  const [saving, setSaving] = useState(false)
  const presence = usePresenceState()
  const { contacts } = useContacts()
  const { kinships } = useKinships()
  const online = getLinkedOnline(presence, contact.linkedUserId)
  const lastSeenAt = getLinkedLastSeen(presence, contact.linkedUserId)

  const contactsForInfer = useMemo(() => {
    const others = contacts.filter((c) => c.id !== contact.id)
    return [contact, ...others]
  }, [contact, contacts])

  const inference = useMemo(
    () => inferHometown(contact.id, contactsForInfer, kinships),
    [contact.id, contactsForInfer, kinships],
  )

  const update = (patch: Partial<Contact>) => {
    setContact((current) => ({ ...current, ...patch }))
  }

  const handleSave = async () => {
    if (!contact.name.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...contact,
        phones: contact.phones.map((v) => v.trim()).filter(Boolean),
        emails: contact.emails.map((v) => v.trim()).filter(Boolean),
        tags: contact.tags.map((v) => v.trim()).filter(Boolean),
        updatedAt: Date.now(),
      })
    } finally {
      setSaving(false)
    }
  }

  const adoptHometown = () => {
    if (!inference) return
    update({ hometown: { ...inference.location } })
  }

  return (
    <form
      className="contact-form"
      onSubmit={(event) => {
        event.preventDefault()
        void handleSave()
      }}
    >
      <div className="form-hero">
        <Avatar
          name={contact.name || '?'}
          src={contact.avatar}
          size="lg"
          online={online}
        />
        <div className="form-hero-main">
          {online != null && (
            <div className="form-hero-presence">
              <OnlineBadge online={online} lastSeenAt={lastSeenAt} />
              <span className="form-hero-presence-hint">已关联平台账号</span>
            </div>
          )}
          <Field label="姓名">
            <input
              value={contact.name}
              onChange={(event) => update({ name: event.target.value })}
              placeholder="输入姓名"
              required
            />
          </Field>
          <Field label="头像链接" hint="可选">
            <input
              value={contact.avatar ?? ''}
              onChange={(event) => update({ avatar: event.target.value || undefined })}
              placeholder="https://..."
            />
          </Field>
        </div>
      </div>

      <FormSection
        icon={<User size={18} />}
        title="联系方式"
        description="手机和邮箱支持多个，用逗号分隔"
      >
        <Field label="手机">
          <input
            value={contact.phones.join(', ')}
            onChange={(event) =>
              update({
                phones: event.target.value.split(/[,，;；]/).map((v) => v.trim()),
              })
            }
            placeholder="13800000000"
            inputMode="tel"
          />
        </Field>
        <Field label="邮箱">
          <input
            type="email"
            value={contact.emails.join(', ')}
            onChange={(event) =>
              update({
                emails: event.target.value.split(/[,，;；]/).map((v) => v.trim()),
              })
            }
            placeholder="name@example.com"
          />
        </Field>
        <Field label="生日">
          <input
            type="date"
            value={contact.birthday ?? ''}
            onChange={(event) => update({ birthday: event.target.value })}
          />
        </Field>
      </FormSection>

      <FormSection icon={<Briefcase size={18} />} title="工作信息">
        <div className="field-row">
          <Field label="公司">
            <input
              value={contact.company ?? ''}
              onChange={(event) => update({ company: event.target.value })}
              placeholder="公司名称"
            />
          </Field>
          <Field label="职位">
            <input
              value={contact.title ?? ''}
              onChange={(event) => update({ title: event.target.value })}
              placeholder="职位"
            />
          </Field>
        </div>
      </FormSection>

      <FormSection
        icon={<MapPin size={18} />}
        title="地理位置"
        description="支持全球地址。可用「城市, 国家」或「省 市 区」，解析后在地图查看"
      >
        <LocationFields
          label="出生地"
          value={contact.birthplace}
          onChange={(birthplace) => update({ birthplace })}
        />
        <LocationFields
          label="籍贯"
          value={contact.hometown}
          onChange={(hometown) => update({ hometown })}
        />
        {inference && (
          <div className="hometown-infer-banner">
            <Sparkles size={16} />
            <div className="hometown-infer-main">
              <strong>{inference.label}</strong>
              <span>{locationToText(inference.location)}</span>
            </div>
            <button type="button" className="button-secondary" onClick={adoptHometown}>
              采用
            </button>
          </div>
        )}
        <LocationFields
          label="现居地"
          value={contact.currentLocation}
          onChange={(currentLocation) => update({ currentLocation })}
        />
      </FormSection>

      <FormSection
        icon={<Heart size={18} />}
        title="家庭关系"
        description="父母、配偶写入本地族谱；子女由父母边反查"
      >
        <KinshipEditor contact={contact} contacts={contacts} />
      </FormSection>

      <FormSection icon={<Tag size={18} />} title="标签与备注">
        <Field label="标签" hint="逗号分隔">
          <input
            value={contact.tags.join(', ')}
            onChange={(event) =>
              update({
                tags: event.target.value.split(/[,，;；]/).map((v) => v.trim()),
              })
            }
            placeholder="同学, 同事, 家人"
          />
        </Field>
        {contact.tags.filter(Boolean).length > 0 && (
          <div className="form-tag-preview">
            {contact.tags.filter(Boolean).map((tag) => (
              <span key={tag} className="tag-chip">
                {tag}
              </span>
            ))}
          </div>
        )}
        <Field label="备注">
          <textarea
            rows={4}
            value={contact.notes ?? ''}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="补充一些你想记住的事..."
          />
        </Field>
      </FormSection>

      <div className="form-actions">
        {onDelete && (
          <button
            type="button"
            className="button-danger"
            onClick={() => {
              if (window.confirm('确定删除这个联系人吗？')) {
                void onDelete(contact.id)
              }
            }}
          >
            <Trash2 size={16} />
            删除
          </button>
        )}
        <div className="form-actions-spacer" />
        <button type="submit" className="button-primary" disabled={saving || !contact.name.trim()}>
          <Save size={16} />
          {saving ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
