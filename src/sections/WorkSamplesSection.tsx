import { useRef, useState } from 'react'
import { RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field, FilePreview, Plate, ViewButton } from '@/components/ui'
import { useAction } from '@/data/store'
import { areaLabel, fmtDate, shortGoal, today } from '@/lib/format'
import type { Area, Goal, Student, WorkSample } from '@/lib/types'

interface Draft {
  title: string
  area_id: string | null
  goal_id: string | null
  entry_id: string | null
  date: string
}

const blank = (areaId: string | null): Draft => ({
  title: '',
  area_id: areaId,
  goal_id: null,
  entry_id: null,
  date: today(),
})

export function WorkSamplesSection({
  rows,
  areas,
  goals,
  student,
}: {
  rows: WorkSample[]
  areas: Area[]
  goals: Goal[]
  student: Student
}) {
  const [form, setForm] = useState<Draft>(() => blank(areas[0]?.id ?? null))
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const edit = useInlineEdit<WorkSample>()

  const add = useAction<{ input: Draft; file: File | null }>((repo, a) =>
    repo.add('workSamples', a.input, a.file),
  )
  const save = useAction<WorkSample>((repo, row) =>
    repo.update('workSamples', row.id, {
      title: row.title,
      area_id: row.area_id,
      goal_id: row.goal_id,
      date: row.date,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('workSamples', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('workSamples', ids))

  const drag = useDragOrder(
    rows.map((r) => r.id),
    (ids) => reorder.mutate(ids),
  )

  const goalsFor = (areaId: string | null) =>
    areaId ? goals.filter((g) => g.area_id === areaId) : []

  function submit() {
    if (!form.title.trim()) return
    add.mutate(
      { input: form, file },
      {
        onSuccess: () => {
          setForm({ ...blank(form.area_id), goal_id: form.goal_id, date: form.date })
          setFile(null)
          if (fileInput.current) fileInput.current.value = ''
        },
      },
    )
  }

  return (
    <div className="editor">
      <div className="add-card" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Field label="What the work is" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Word family sort — -at, -op, -in"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>
        <Field label="Area">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.area_id ?? ''}
              onChange={(e) =>
                setForm({ ...form, area_id: e.target.value || null, goal_id: null })
              }
            >
              <option value="">Unassigned</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Goal it evidences">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.goal_id ?? ''}
              onChange={(e) => setForm({ ...form, goal_id: e.target.value || null })}
            >
              <option value="">No specific goal</option>
              {goalsFor(form.area_id).map((g) => (
                <option key={g.id} value={g.id}>
                  {shortGoal(g.text, 60)}
                </option>
              ))}
            </select>
          )}
        </Field>
        {student.show_dates && (
          <Field label="Date">
            {(id) => (
              <input
                id={id}
                className="input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            )}
          </Field>
        )}
        <Field label="Photo or scan" span>
          {(id) => (
            <input
              id={id}
              ref={fileInput}
              className="input"
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          )}
        </Field>
        <div className="span-all">
          <FilePreview file={file} />
        </div>
        <button
          type="button"
          className="btn btn-primary span-all justify-start"
          onClick={submit}
          disabled={add.isPending || !form.title.trim()}
        >
          {add.isPending ? 'Adding…' : 'Add sample'}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No samples yet. Two or three photographs per area is plenty.</EmptyState>
      ) : (
        <div
          className="figure-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}
        >
          {rows.map((row) => {
            const editing = edit.isEditing(row.id)
            const goal = goals.find((g) => g.id === row.goal_id)
            return (
              <figure key={row.id} className="figure" {...drag.handlers(row.id)}>
                <Plate
                  url={row.url}
                  height="150px"
                  placeholder="drop photo or scan"
                  alt={row.title}
                  zoomable
                />
                {editing && edit.draft ? (
                  <div className="edit-grid">
                    <input
                      className="input span-all"
                      value={edit.draft.title}
                      onChange={(e) => edit.set('title', e.target.value)}
                      aria-label="What the work is"
                    />
                    <select
                      className="input span-all"
                      value={edit.draft.area_id ?? ''}
                      onChange={(e) => {
                        edit.set('area_id', e.target.value || null)
                        edit.set('goal_id', null)
                      }}
                      aria-label="Area"
                    >
                      <option value="">Unassigned</option>
                      {areas.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                    <select
                      className="input span-all"
                      value={edit.draft.goal_id ?? ''}
                      onChange={(e) => edit.set('goal_id', e.target.value || null)}
                      aria-label="Goal it evidences"
                    >
                      <option value="">No specific goal</option>
                      {goalsFor(edit.draft.area_id).map((g) => (
                        <option key={g.id} value={g.id}>
                          {shortGoal(g.text, 60)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <figcaption style={{ fontSize: 13, lineHeight: 1.4 }}>
                    <div>{row.title}</div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                      {[
                        areaLabel(row.area_id, areas),
                        student.show_dates ? fmtDate(row.date) : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                    {goal && (
                      <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                        Evidence for: {shortGoal(goal.text, 50)}
                      </div>
                    )}
                  </figcaption>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ViewButton url={row.url} mime={row.mime} title={row.title} />
                  <RowActions
                  editing={editing}
                  onEdit={() => edit.start(row)}
                  onSave={() => {
                    if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                  }}
                  onCancel={edit.cancel}
                  onRemove={() => remove.mutate(row.id)}
                  removeConfirm={
                    row.storage_path
                      ? `Remove “${row.title}” and delete the uploaded photo?`
                      : undefined
                  }
                  />
                </div>
              </figure>
            )
          })}
        </div>
      )}
    </div>
  )
}
