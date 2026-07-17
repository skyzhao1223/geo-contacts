import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; to: string }
  secondaryAction?: { label: string; to: string }
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="empty-state-card">
      {icon && <div className="empty-state-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {(action || secondaryAction) && (
        <div className="empty-state-actions">
          {action && (
            <Link to={action.to} className="button-primary">
              {action.label}
            </Link>
          )}
          {secondaryAction && (
            <Link to={secondaryAction.to} className="button-secondary">
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
