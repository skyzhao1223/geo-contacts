import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  compact?: boolean
}

export function PageHeader({ title, description, actions, compact }: PageHeaderProps) {
  return (
    <header className={`page-header ${compact ? 'page-header-compact' : ''}`}>
      <div className="page-header-main">
        <h1 className="page-title">{title}</h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}
