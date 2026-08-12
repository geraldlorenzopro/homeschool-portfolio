import type { ReactNode } from 'react'

/** The Edit / Remove pair every list row carries, and its editing counterpart. */
export function RowActions({
  editing,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  removeConfirm,
}: {
  editing: boolean
  onEdit: () => void
  onSave: () => void
  onCancel: () => void
  onRemove: () => void
  /** Shown in a confirmation before deleting — used when a file goes too. */
  removeConfirm?: string
}) {
  if (editing) {
    return (
      <div className="row-actions">
        <button type="button" className="btn btn-primary" style={{ fontSize: 12 }} onClick={onSave}>
          Save
        </button>
        <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onCancel}>
          Cancel
        </button>
      </div>
    )
  }
  return (
    <div className="row-actions">
      <button type="button" className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onEdit}>
        Edit
      </button>
      <button
        type="button"
        className="btn btn-ghost"
        style={{ fontSize: 12 }}
        onClick={() => {
          if (removeConfirm && !window.confirm(removeConfirm)) return
          onRemove()
        }}
      >
        Remove
      </button>
    </div>
  )
}

/** Grab area for reordering. Purely decorative — the whole row is draggable. */
export function DragHandle() {
  return (
    <span className="drag-handle" aria-hidden="true" title="Drag to reorder">
      ⠿
    </span>
  )
}

export function EditGrid({ children }: { children: ReactNode }) {
  return <div className="edit-grid">{children}</div>
}
