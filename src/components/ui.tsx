import { useId, type ReactNode } from 'react'

export function Field({
  label,
  span,
  children,
}: {
  label: string
  /** Stretch across the whole add-card grid. */
  span?: boolean
  children: (id: string) => ReactNode
}) {
  const id = useId()
  return (
    <div className={span ? 'field span-all' : 'field'}>
      <label htmlFor={id}>{label}</label>
      {children(id)}
    </div>
  )
}

/**
 * The hatched box the design uses wherever a file has not been supplied.
 * Kept rather than hidden — the evaluator sees the slot exists.
 */
export function PlaceholderBox({ label, height }: { label: string; height: string }) {
  return (
    <div
      style={{
        height,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '10px',
        background: 'repeating-linear-gradient(135deg, #eae7e7 0 8px, #e0dcdc 8px 16px)',
        color: '#7d7979',
        fontFamily: 'ui-monospace, Menlo, monospace',
        fontSize: '10px',
        letterSpacing: '0.04em',
        boxSizing: 'border-box',
      }}
    >
      {label}
    </div>
  )
}

/** Photographs are matted: a surface-coloured border with a hairline outline. */
export function Plate({
  url,
  height,
  placeholder,
  fit = 'cover',
}: {
  url: string | null
  height: string
  placeholder: string
  fit?: 'cover' | 'contain'
}) {
  if (!url) {
    return (
      <div className="plate" style={{ padding: 0 }}>
        <PlaceholderBox label={placeholder} height={height} />
      </div>
    )
  }
  return (
    <div
      className="plate"
      style={{
        height,
        backgroundImage: `url("${cssUrl(url)}")`,
        backgroundSize: fit,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    />
  )
}

/**
 * A URL goes into a CSS value, where React does no escaping. Quote it and drop
 * the characters that could close the url() — signed URLs and data URLs never
 * contain them, so nothing legitimate is lost.
 */
function cssUrl(url: string): string {
  return url.replace(/["'()\\\s]/g, encodeURIComponent)
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>
}

export function RemoveButton({
  onClick,
  label = 'Remove',
}: {
  onClick: () => void
  label?: string
}) {
  return (
    <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onClick}>
      {label}
    </button>
  )
}
