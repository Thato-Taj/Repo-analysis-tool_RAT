import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import type { MetricStat } from '../types'

interface MetricCardProps {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  /** Direction of the trend, controls colour of the hint. */
  trend?: 'up' | 'down' | 'flat'
}

export default function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  trend = 'flat',
}: MetricCardProps) {
  const Trend = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null
  return (
    <div className="metric-card">
      <div className="metric-card__label">
        <span className="metric-card__icon">
          <Icon size={14} />
        </span>
        {label}
      </div>
      <div className="metric-card__value">{value}</div>
      {hint && (
        <div className={`metric-card__hint${trend !== 'flat' ? ` is-${trend}` : ''}`}>
          {Trend && (
            <Trend size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
          )}
          {hint}
        </div>
      )}
    </div>
  )
}

export type { MetricStat }
