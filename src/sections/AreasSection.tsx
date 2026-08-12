import { useState } from 'react'
import { DragHandle, RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field } from '@/components/ui'
import { useAction } from '@/data/store'
import type { Area, Goal, Entry } from '@/lib/types'

export function AreasSection({
  areas,
  goals,
  entries,
}: {
  areas: Area[]
  goals: Goal[]
  entries: Entry[]
}) {
  const [label, setLabel] = useState('')
  const edit = useInlineEdit<Area>()

  const add = useAction<string>((repo, text) =>
    repo.add('areas', {
      // A key the database can rely on, derived from what was typed.
      key: text.trim().toLowerCase().replace(/[^\w]+/g, '_').slice(0, 40) || `area_${Date.now()}`,
      label: text.trim(),
      is_custom: true,
    }),
  )
  const save = useAction<Area>((repo, row) =>
    repo.update('areas', row.id, { label: row.label }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('areas', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('areas', ids))

  const drag = useDragOrder(
    areas.map((a) => a.id),
    (ids) => reorder.mutate(ids),
  )

  function submit() {
    if (!label.trim()) return
    add.mutate(label, { onSuccess: () => setLabel('') })
  }

  return (
    <div className="editor">
      <div className="add-card" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
        <Field label="New area">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="e.g. Music, Occupational Therapy, Life Skills"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          )}
        </Field>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={!label.trim()}>
          + Add area
        </button>
      </div>

      {areas.length === 0 ? (
        <EmptyState>No areas yet. Add the first one above.</EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>Area</th>
              <th style={{ width: 90 }}>Goals</th>
              <th style={{ width: 90 }}>Entries</th>
              <th style={{ width: 150 }} />
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => {
              const editing = edit.isEditing(area.id)
              const goalCount = goals.filter((g) => g.area_id === area.id).length
              const entryCount = entries.filter((e) => e.area_id === area.id).length
              return (
                <tr key={area.id} data-editing={editing || undefined} {...drag.handlers(area.id)}>
                  <td>
                    <DragHandle />
                  </td>
                  <td>
                    {editing && edit.draft ? (
                      <input
                        className="input"
                        value={edit.draft.label}
                        onChange={(e) => edit.set('label', e.target.value)}
                        aria-label="Area name"
                      />
                    ) : (
                      <>
                        {area.label}
                        {area.is_custom && (
                          <span className="pill" style={{ marginLeft: 8 }}>
                            Custom
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="num">{goalCount}</td>
                  <td className="num">{entryCount}</td>
                  <td>
                    <RowActions
                      editing={editing}
                      onEdit={() => edit.start(area)}
                      onSave={() => {
                        if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                      }}
                      onCancel={edit.cancel}
                      onRemove={() => remove.mutate(area.id)}
                      removeConfirm={
                        goalCount || entryCount
                          ? `“${area.label}” has ${goalCount} goal(s) and ${entryCount} entry/entries. Removing the area deletes them too. Continue?`
                          : undefined
                      }
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
