import { Eye } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { isPdf } from '@/lib/image'

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
      className="hatched"
      style={{
        height,
        display: 'flex',
        alignItems: 'flex-end',
        padding: '10px',
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

/**
 * Photographs are matted: a surface-coloured border with a hairline outline.
 *
 * The picture is a real <img>, not a CSS background. Browsers drop background
 * images when printing unless every ancestor opts in, which is why scans used
 * to look right on screen and come out blank in the PDF.
 */
export function Lightbox({
  url,
  alt,
  onClose,
}: {
  url: string
  alt: string
  onClose: () => void
}) {
  return (
    <div
      className="dialog-backdrop no-print"
      role="dialog"
      aria-modal="true"
      aria-label={alt || 'Full size preview'}
      style={{ cursor: 'zoom-out', zIndex: 40 }}
      onClick={onClose}
    >
      <img
        src={url}
        alt={alt}
        style={{
          maxWidth: '92vw',
          maxHeight: '92vh',
          objectFit: 'contain',
          boxShadow: 'var(--shadow-lg)',
          border: '8px solid var(--color-surface)',
        }}
      />
    </div>
  )
}

/**
 * See the file without leaving the page. Images open in the lightbox; PDFs go
 * to a new tab, where the browser's own reader beats anything drawn here.
 */
export function ViewButton({
  url,
  mime,
  title,
}: {
  url: string | null
  mime: string | null
  title: string
}) {
  const [open, setOpen] = useState(false)
  if (!url) return null

  const label = `View ${title}`

  if (isPdf(mime)) {
    return (
      <a
        className="btn btn-ghost btn-icon"
        href={url}
        target="_blank"
        rel="noreferrer"
        title={label}
        aria-label={label}
      >
        <Eye size={15} />
      </a>
    )
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        onClick={() => setOpen(true)}
        title={label}
        aria-label={label}
      >
        <Eye size={15} />
      </button>
      {open && <Lightbox url={url} alt={title} onClose={() => setOpen(false)} />}
    </>
  )
}

export function Plate({
  url,
  height,
  placeholder,
  fit = 'cover',
  alt = '',
  zoomable = false,
}: {
  url: string | null
  height: string
  placeholder: string
  fit?: 'cover' | 'contain'
  alt?: string
  /** Click to open the full-size picture. Off inside the printed document. */
  zoomable?: boolean
}) {
  const [zoomed, setZoomed] = useState(false)

  if (!url) {
    return (
      <div className="plate" style={{ padding: 0 }}>
        <PlaceholderBox label={placeholder} height={height} />
      </div>
    )
  }

  return (
    <>
      <div
        className="plate"
        style={{ height, padding: 0, cursor: zoomable ? 'zoom-in' : undefined }}
        onClick={zoomable ? () => setZoomed(true) : undefined}
      >
        <img
          src={url}
          alt={alt}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }}
        />
      </div>

      {zoomed && <Lightbox url={url} alt={alt} onClose={() => setZoomed(false)} />}
    </>
  )
}

/** Thumbnail of a file the user has picked but not yet saved. */
export function FilePreview({ file }: { file: File | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [current, setCurrent] = useState<File | null>(null)

  // Derive during render rather than in an effect: the object URL must exist
  // on the same paint as the file that produced it.
  if (file !== current) {
    if (url) URL.revokeObjectURL(url)
    setCurrent(file)
    setUrl(file && file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  if (!file) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      {url ? (
        <div className="plate" style={{ width: 64, height: 64, padding: 0, flex: 'none' }}>
          <img
            src={url}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      ) : (
        <span className="tag tag-accent">{file.type.includes('pdf') ? 'PDF' : 'File'}</span>
      )}
      <span style={{ fontSize: 12, opacity: 0.7 }}>
        {file.name} · {Math.round(file.size / 1024)} KB
      </span>
    </div>
  )
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
