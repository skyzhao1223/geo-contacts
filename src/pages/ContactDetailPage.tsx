import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ContactForm } from '@/components/contacts'
import { PageHeader, Avatar, OnlineBadge } from '@/components/ui'
import { useContacts } from '@/context/ContactsContext'
import { usePresenceState } from '@/context/PresenceContext'
import { getLinkedOnline } from '@/lib/presence'
import { createEmptyContact } from '@/types/contact'

export function ContactDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addContact, updateContact, removeContact, getContactById } = useContacts()
  const presence = usePresenceState()
  const [initial, setInitial] = useState(createEmptyContact())
  const [loading, setLoading] = useState(id !== 'new')

  useEffect(() => {
    if (!id || id === 'new') {
      setInitial(createEmptyContact())
      setLoading(false)
      return
    }

    void getContactById(id).then((contact) => {
      if (contact) setInitial(contact)
      setLoading(false)
    })
  }, [id, getContactById])

  if (loading) {
    return (
      <div className="empty-state">
        <div className="loading-spinner" />
      </div>
    )
  }

  const isNew = id === 'new'
  const online = getLinkedOnline(presence, initial.linkedUserId)

  return (
    <div className="page-stack">
      <PageHeader
        title={isNew ? '新建联系人' : initial.name || '编辑联系人'}
        description="补充全球地址（出生地、籍贯、现居地）后可在地图查看分布。"
        actions={
          <>
            <Link to="/" className="button-ghost">
              <ArrowLeft size={16} />
              返回
            </Link>
            {!isNew && (
              <div className="detail-header-presence">
                <Avatar name={initial.name} src={initial.avatar} size="md" online={online} />
                {online != null && <OnlineBadge online={online} compact />}
              </div>
            )}
          </>
        }
      />

      <section className="panel form-panel">
        <ContactForm
          initial={initial}
          onSave={async (contact) => {
            if (isNew) {
              await addContact(contact)
            } else {
              await updateContact(contact)
            }
            navigate('/')
          }}
          onDelete={
            !isNew
              ? async (contactId) => {
                  await removeContact(contactId)
                  navigate('/')
                }
              : undefined
          }
        />
      </section>
    </div>
  )
}
