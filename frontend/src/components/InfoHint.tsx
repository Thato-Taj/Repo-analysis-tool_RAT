import { CircleHelp } from 'lucide-react'
import { METRIC_DEFS } from '../lib/format'

/** A lightweight "?" that reveals a metric definition on hover/focus. */
export default function InfoHint({ defId }: { defId: keyof typeof METRIC_DEFS | string }) {
  const text = METRIC_DEFS[defId]
  if (!text) return null
  return (
    <span className="help" tabIndex={0}>
      <CircleHelp size={13} />
      <span className="help__bubble" role="tooltip">
        {text}
      </span>
    </span>
  )
}
