import { useState } from 'react'

/**
 * One row at a time turns into a form in place. The draft is a copy, so
 * cancelling leaves the stored row untouched and a refetch mid-edit cannot
 * overwrite what is being typed.
 */
export function useInlineEdit<T extends { id: string }>() {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<T | null>(null)

  return {
    editingId,
    draft,
    isEditing: (id: string) => editingId === id,
    start(row: T) {
      setEditingId(row.id)
      setDraft({ ...row })
    },
    cancel() {
      setEditingId(null)
      setDraft(null)
    },
    set<K extends keyof T>(key: K, value: T[K]) {
      setDraft((d) => (d ? { ...d, [key]: value } : d))
    },
  }
}
