interface OnlineBadgeProps {
  online: boolean
  lastSeenAt?: number | null
  /** 列表等紧凑场景只显示「在线/离线」 */
  compact?: boolean
}

export function OnlineBadge({ online, lastSeenAt, compact = false }: OnlineBadgeProps) {
  const label = online
    ? '在线'
    : compact
      ? '离线'
      : lastSeenAt
        ? `离线 · ${new Date(lastSeenAt).toLocaleString()}`
        : '离线'

  return (
    <span className={`online-badge ${online ? 'online-badge-on' : 'online-badge-off'}`}>
      <span className="online-dot" />
      {label}
    </span>
  )
}
