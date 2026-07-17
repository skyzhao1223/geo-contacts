import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranchPlus, Trash2, UserRound, Heart, Baby } from 'lucide-react'
import type { Contact } from '@/types/contact'
import type { ParentRole } from '@/types/kinship'
import { useKinships } from '@/context/KinshipsContext'
import { getChildren, getParents, getSpouses } from '@/lib/family-tree'
import { PersonPicker } from './PersonPicker'
import { Avatar } from '@/components/ui/Avatar'

interface KinshipEditorProps {
  contact: Contact
  contacts: Contact[]
}

const ROLE_OPTIONS: Array<{ value: ParentRole; label: string }> = [
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'parent', label: '未区分' },
]

function roleLabel(role: ParentRole): string {
  if (role === 'father') return '父亲'
  if (role === 'mother') return '母亲'
  return '父母'
}

export function KinshipEditor({ contact, contacts }: KinshipEditorProps) {
  const { kinships, setParent, removeParent, setSpouse, removeSpouse } = useKinships()
  const [parentRole, setParentRole] = useState<ParentRole>('father')
  const [message, setMessage] = useState('')

  const contactMap = useMemo(
    () => new Map(contacts.map((c) => [c.id, c])),
    [contacts],
  )

  const parents = getParents(kinships, contact.id)
  const children = getChildren(kinships, contact.id)
  const spouses = getSpouses(kinships, contact.id)
  const exclude = [contact.id, ...parents.map((p) => p.contactId), ...spouses, ...children]

  return (
    <div className="kinship-editor">
      <div className="kinship-block">
        <div className="kinship-block-header">
          <div className="kinship-block-title">
            <UserRound size={15} />
            <h4>父母</h4>
          </div>
          <div className="kinship-role-pills" role="group" aria-label="父母角色">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`kinship-role-pill ${parentRole === opt.value ? 'is-active' : ''}`}
                onClick={() => setParentRole(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <PersonPicker
          contacts={contacts}
          excludeIds={exclude}
          placeholder={`搜索并添加${roleLabel(parentRole)}…`}
          onSelect={(picked) => {
            void setParent(contact.id, picked.id, parentRole)
              .then(() => setMessage(`已添加：${picked.name}`))
              .catch((err: Error) => setMessage(err.message))
          }}
        />
        {parents.length === 0 ? (
          <p className="kinship-empty-hint">先选角色，再搜索联系人添加为父母</p>
        ) : (
          <ul className="kinship-list">
            {parents.map((parent) => {
              const person = contactMap.get(parent.contactId)
              return (
                <li key={parent.contactId} className="kinship-list-item">
                  <Avatar name={person?.name ?? '?'} src={person?.avatar} size="sm" />
                  <div className="kinship-list-main">
                    {person ? (
                      <Link to={`/contacts/${person.id}`}>{person.name}</Link>
                    ) : (
                      <span>未知</span>
                    )}
                    <em>{roleLabel(parent.role)}</em>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    title="移除"
                    onClick={() => void removeParent(contact.id, parent.contactId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="kinship-block">
        <div className="kinship-block-header">
          <div className="kinship-block-title">
            <Heart size={15} />
            <h4>配偶</h4>
          </div>
        </div>
        <PersonPicker
          contacts={contacts}
          excludeIds={exclude}
          placeholder="搜索并添加配偶…"
          onSelect={(picked) => {
            void setSpouse(contact.id, picked.id)
              .then(() => setMessage(`已添加配偶：${picked.name}`))
              .catch((err: Error) => setMessage(err.message))
          }}
        />
        {spouses.length === 0 ? (
          <p className="kinship-empty-hint">暂无配偶关系</p>
        ) : (
          <ul className="kinship-list">
            {spouses.map((spouseId) => {
              const person = contactMap.get(spouseId)
              return (
                <li key={spouseId} className="kinship-list-item">
                  <Avatar name={person?.name ?? '?'} src={person?.avatar} size="sm" />
                  <div className="kinship-list-main">
                    {person ? (
                      <Link to={`/contacts/${person.id}`}>{person.name}</Link>
                    ) : (
                      <span>未知</span>
                    )}
                    <em>配偶</em>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    title="移除"
                    onClick={() => void removeSpouse(contact.id, spouseId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {children.length > 0 && (
        <div className="kinship-block">
          <div className="kinship-block-header">
            <div className="kinship-block-title">
              <Baby size={15} />
              <h4>子女</h4>
            </div>
            <span className="kinship-block-note">由父母关系反查</span>
          </div>
          <ul className="kinship-list">
            {children.map((childId) => {
              const person = contactMap.get(childId)
              return (
                <li key={childId} className="kinship-list-item">
                  <Avatar name={person?.name ?? '?'} src={person?.avatar} size="sm" />
                  <div className="kinship-list-main">
                    {person ? (
                      <Link to={`/contacts/${person.id}`}>{person.name}</Link>
                    ) : (
                      <span>未知</span>
                    )}
                    <em>子女</em>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Link to={`/family?root=${contact.id}`} className="button-secondary kinship-tree-link">
        <GitBranchPlus size={16} />
        在族谱中查看
      </Link>

      {message && <div className="status-banner">{message}</div>}
    </div>
  )
}
