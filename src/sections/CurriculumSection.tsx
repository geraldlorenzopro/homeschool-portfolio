import { useState } from 'react'
import { DragHandle, RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field } from '@/components/ui'
import { useAction } from '@/data/store'
import { areaLabel } from '@/lib/format'
import type { Area, Curriculum } from '@/lib/types'

interface Draft {
  title: string
  publisher: string
  area_id: string | null
  usage: string
}

const blank = (): Draft => ({ title: '', publisher: '', area_id: null, usage: '' })

export function CurriculumSection({ rows, areas }: { rows: Curriculum[]; areas: Area[] }) {
  const [form, setForm] = useState<Draft>(blank)
  const edit = useInlineEdit<Curriculum>()

  const add = useAction<Draft>((repo, input) => repo.add('curriculums', input))
  const save = useAction<Curriculum>((repo, row) =>
    repo.update('curriculums', row.id, {
      title: row.title,
      publisher: row.publisher,
      area_id: row.area_id,
      usage: row.usage,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('curriculums', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('curriculums', ids))

  const drag = useDragOrder(
    rows.map((r) => r.id),
    (ids) => reorder.mutate(ids),
  )

  function submit() {
    if (!form.title.trim()) return
    add.mutate(form, { onSuccess: () => setForm({ ...blank(), area_id: form.area_id }) })
  }

  const AreaSelect = ({
    value,
    onChange,
    id,
  }: {
    value: string | null
    onChange: (v: string | null) => void
    id?: string
  }) => (
    <select
      id={id}
      className="input"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      aria-label="Area"
    >
      <option value="">Multiple areas</option>
      {areas.map((a) => (
        <option key={a.id} value={a.id}>
          {a.label}
        </option>
      ))}
    </select>
  )

  return (
    <div className="editor">
      <div className="add-card" style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)' }}>
        <Field label="Curriculum or program" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Math-U-See Alpha"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>
        <Field label="Publisher or author">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Demme Learning"
              value={form.publisher}
              onChange={(e) => setForm({ ...form, publisher: e.target.value })}
            />
          )}
        </Field>
        <Field label="Area">
          {(id) => (
            <AreaSelect id={id} value={form.area_id} onChange={(v) => setForm({ ...form, area_id: v })} />
          )}
        </Field>
        <Field label="How it was used" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Core program, three lessons a week, September through March"
              value={form.usage}
              onChange={(e) => setForm({ ...form, usage: e.target.value })}
            />
          )}
        </Field>
        <button
          type="button"
          className="btn btn-primary span-all justify-start"
          onClick={submit}
          disabled={!form.title.trim()}
        >
          Add curriculum
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          No curriculum listed yet. Add the programs and textbooks you taught from this year.
        </EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>Curriculum</th>
              <th style={{ width: 180 }}>Publisher</th>
              <th style={{ width: 160 }}>Area</th>
              <th style={{ width: 150 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const editing = edit.isEditing(row.id)
              return (
                <tr key={row.id} data-editing={editing || undefined} {...drag.handlers(row.id)}>
                  <td>
                    <DragHandle />
                  </td>
                  <td>
                    {editing && edit.draft ? (
                      <div className="edit-grid">
                        <input
                          className="input span-all"
                          value={edit.draft.title}
                          onChange={(e) => edit.set('title', e.target.value)}
                          aria-label="Curriculum or program"
                        />
                        <input
                          className="input span-all"
                          value={edit.draft.usage}
                          onChange={(e) => edit.set('usage', e.target.value)}
                          aria-label="How it was used"
                        />
                      </div>
                    ) : (
                      <>
                        <div>{row.title}</div>
                        {row.usage && <div className="row-sub">{row.usage}</div>}
                      </>
                    )}
                  </td>
                  <td style={{ opacity: 0.75 }}>
                    {editing && edit.draft ? (
                      <input
                        className="input"
                        value={edit.draft.publisher}
                        onChange={(e) => edit.set('publisher', e.target.value)}
                        aria-label="Publisher or author"
                      />
                    ) : (
                      row.publisher
                    )}
                  </td>
                  <td style={{ opacity: 0.75 }}>
                    {editing && edit.draft ? (
                      <AreaSelect
                        value={edit.draft.area_id}
                        onChange={(v) => edit.set('area_id', v)}
                      />
                    ) : row.area_id ? (
                      areaLabel(row.area_id, areas)
                    ) : (
                      'Multiple areas'
                    )}
                  </td>
                  <td>
                    <RowActions
                      editing={editing}
                      onEdit={() => edit.start(row)}
                      onSave={() => {
                        if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                      }}
                      onCancel={edit.cancel}
                      onRemove={() => remove.mutate(row.id)}
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
