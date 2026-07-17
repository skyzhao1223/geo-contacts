import type { Contact, DuplicateGroup } from '@/types/contact'
import { usePresenceState } from '@/context/PresenceContext'
import { getLinkedOnline } from '@/lib/presence'
import { Avatar } from '@/components/ui/Avatar'
import { OnlineBadge } from '@/components/ui/OnlineBadge'

interface MergePanelProps {
  groups: DuplicateGroup[]
  contacts: Contact[]
  onMerge: (group: DuplicateGroup) => Promise<void>
}

export function MergePanel({ groups, contacts, onMerge }: MergePanelProps) {
  const presence = usePresenceState()

  if (groups.length === 0) return null

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>可能重复</h2>
          <p>发现 {groups.length} 组姓名或联系方式相近的联系人，可合并为一条。</p>
        </div>
      </div>

      <div className="merge-list">
        {groups.map((group) => {
          const members = contacts.filter((contact) => group.contactIds.includes(contact.id))
          return (
            <div key={group.id} className="merge-card">
              <div>
                <h3>{group.reason}</h3>
                <ul className="merge-member-list">
                  {members.map((member) => {
                    const online = getLinkedOnline(presence, member.linkedUserId)
                    return (
                      <li key={member.id} className="merge-member">
                        <Avatar
                          name={member.name}
                          src={member.avatar}
                          size="sm"
                          online={online}
                        />
                        <div className="merge-member-main">
                          <div className="merge-member-top">
                            <strong>{member.name}</strong>
                            {online != null && <OnlineBadge online={online} compact />}
                          </div>
                          <span>{member.phones[0] || member.emails[0] || '无联系方式'}</span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <button
                type="button"
                className="button-primary"
                onClick={() => void onMerge(group)}
              >
                合并为一项
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
