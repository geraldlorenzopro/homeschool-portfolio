import { useRef } from 'react'
import { FilePlate, ViewButton } from '@/components/ui'
import type { Attachment, AttachmentOwner } from '@/lib/types'

/**
 * The documents filed against a single row — a curriculum, a book, a goal —
 * shown inline with an eye to open each, and a control to add another.
 */
export function RowFiles({
  files,
  onAdd,
  onRemove,
  pending,
  label = 'file',
}: {
  files: Attachment[]
  onAdd: (file: File) => void
  onRemove: (id: string) => void
  pending: boolean
  label?: string
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
      {files.map((f) => (
        <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ width: 34, height: 34, display: 'inline-block' }}>
            <FilePlate
              url={f.url}
              mime={f.mime}
              title={f.title}
              height="34px"
              fit="contain"
              placeholder="file"
            />
          </span>
          <ViewButton url={f.url} mime={f.mime} title={f.title} />
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: 11 }}
            onClick={() => {
              if (window.confirm(`Remove “${f.title}”?`)) onRemove(f.id)
            }}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const picked = e.target.files?.[0]
          if (picked) onAdd(picked)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="btn btn-ghost"
        style={{ fontSize: 12 }}
        onClick={() => input.current?.click()}
        disabled={pending}
      >
        {pending ? 'Uploading…' : files.length ? `+ Add another ${label}` : `+ Add ${label}`}
      </button>
    </div>
  )
}

export function filesFor(
  attachments: Attachment[],
  owner: AttachmentOwner,
  ownerId: string,
): Attachment[] {
  return attachments.filter((a) => a.owner_type === owner && a.owner_id === ownerId)
}
