import { useRef, useState } from 'react'
import { DragHandle, RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field, FilePreview, Plate, ViewButton } from '@/components/ui'
import { useAction } from '@/data/store'
import { fmtDate, shortGoal, today } from '@/lib/format'
import {
  OUTCOME_LEVELS,
  OUTCOME_LEVEL_LABEL,
  type Area,
  type Entry,
  type Goal,
  type OutcomeLevel,
  type Student,
  type WorkSample,
} from '@/lib/types'

interface Draft {
  area_id: string
  goal_id: string | null
  title: string
  method: string
  outcome: string
  outcome_level: OutcomeLevel | null
  date: string
  hours: string
}

const blank = (areaId: string): Draft => ({
  area_id: areaId,
  goal_id: null,
  title: '',
  method: '',
  outcome: '',
  outcome_level: null,
  date: today(),
  hours: '',
})

export function EntriesSection({
  student,
  area,
  goals,
  entries,
  workSamples,
}: {
  student: Student
  /** The one area this section records. */
  area: Area
  goals: Goal[]
  entries: Entry[]
  workSamples: WorkSample[]
}) {
  const [form, setForm] = useState<Draft>(() => blank(area.id))
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const edit = useInlineEdit<Entry>()

  // A photo taken during a session becomes a proper work sample — Florida asks
  // for "samples of work" as its own section, so it cannot hide inside a log
  // row. It just arrives already filed against this session, area and goal.
  const add = useAction<{ input: Draft; file: File | null }>(async (repo, a) => {
    const entryId = await repo.add('entries', a.input)
    if (a.file) {
      await repo.add(
        'workSamples',
        {
          title: a.input.title,
          area_id: a.input.area_id,
          goal_id: a.input.goal_id,
          entry_id: entryId,
          date: a.input.date,
        },
        a.file,
      )
    }
  })
  const addSample = useAction<{ entry: Entry; file: File }>((repo, a) =>
    repo.add(
      'workSamples',
      {
        title: a.entry.title,
        area_id: a.entry.area_id,
        goal_id: a.entry.goal_id,
        entry_id: a.entry.id,
        date: a.entry.date,
      },
      a.file,
    ),
  )
  const save = useAction<Entry>((repo, row) =>
    repo.update('entries', row.id, {
      area_id: row.area_id,
      goal_id: row.goal_id,
      title: row.title,
      method: row.method,
      outcome: row.outcome,
      outcome_level: row.outcome_level,
      date: row.date,
      hours: row.hours,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('entries', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('entries', ids))

  const drag = useDragOrder(
    entries.map((e) => e.id),
    (ids) => reorder.mutate(ids),
  )


  // Only this area's goals and entries belong here.
  const areaGoals = goals.filter((g) => g.area_id === area.id)
  const rows = entries.filter((e) => e.area_id === area.id)
  const areaId = area.id
  const goalId = areaGoals.some((g) => g.id === form.goal_id) ? form.goal_id : null

  function submit() {
    if (!form.title.trim() || !areaId) return
    // Area, goal and date stay put: a day's work usually shares all three.
    add.mutate(
      { input: { ...form, area_id: areaId, goal_id: goalId }, file },
      {
        onSuccess: () => {
          setForm({ ...blank(areaId), goal_id: goalId, date: form.date })
          setFile(null)
          if (fileInput.current) fileInput.current.value = ''
        },
      },
    )
  }

  return (
    <div className="editor">
      <div className="add-card" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <Field label="Goal worked on">
          {(id) => (
            <select
              id={id}
              className="input"
              value={goalId ?? ''}
              onChange={(e) => setForm({ ...form, goal_id: e.target.value || null })}
            >
              <option value="">No specific goal</option>
              {areaGoals.map((g) => (
                <option key={g.id} value={g.id}>
                  {shortGoal(g.text, 60)}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="What was covered" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Short vowel word families"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>

        <Field label="Method used to work the goal" span>
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 60 }}
              placeholder="Letter tiles for -at, -op and -in; built each word, said the sounds, then read the list back."
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
            />
          )}
        </Field>

        <Field label="Outcome — how the child responded" span>
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 60 }}
              placeholder="Read 18 of 20 words with no prompting. Self-corrected twice without being asked."
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value })}
            />
          )}
        </Field>

        <Field label="Level of support">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.outcome_level ?? ''}
              onChange={(e) =>
                setForm({ ...form, outcome_level: (e.target.value || null) as OutcomeLevel | null })
              }
            >
              <option value="">Not recorded</option>
              {OUTCOME_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {OUTCOME_LEVEL_LABEL[l]}
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

        {student.show_hours && (
          <Field label="Hours">
            {(id) => (
              <input
                id={id}
                className="input"
                type="number"
                step="0.5"
                min="0"
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
              />
            )}
          </Field>
        )}

        <Field label="Photo or scan of the work" span>
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
          {add.isPending ? 'Adding…' : 'Add entry'}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          Nothing recorded for {area.label} yet. Each entry captures one session: what you
          covered, how you taught it, and how the child responded.
        </EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              {student.show_dates && <th style={{ width: 110 }}>Date</th>}
              <th>Session</th>
              {student.show_hours && <th style={{ width: 60 }}>Hours</th>}
              <th style={{ width: 150 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => {
              const editing = edit.isEditing(entry.id)
              const goal = goals.find((g) => g.id === entry.goal_id)
              return (
                <tr key={entry.id} data-editing={editing || undefined} {...drag.handlers(entry.id)}>
                  <td>
                    <DragHandle />
                  </td>

                  {student.show_dates && (
                    <td className="nowrap" style={{ opacity: 0.7 }}>
                      {editing && edit.draft ? (
                        <input
                          className="input"
                          type="date"
                          value={edit.draft.date}
                          onChange={(e) => edit.set('date', e.target.value)}
                          aria-label="Date"
                        />
                      ) : (
                        fmtDate(entry.date)
                      )}
                    </td>
                  )}

                  <td>
                    {editing && edit.draft ? (
                      <div className="edit-grid">
                        <input
                          className="input span-all"
                          value={edit.draft.title}
                          onChange={(e) => edit.set('title', e.target.value)}
                          aria-label="What was covered"
                        />
                        <select
                          className="input span-all"
                          value={edit.draft.goal_id ?? ''}
                          onChange={(e) => edit.set('goal_id', e.target.value || null)}
                          aria-label="Goal worked on"
                        >
                          <option value="">No specific goal</option>
                          {areaGoals.map((g) => (
                            <option key={g.id} value={g.id}>
                              {shortGoal(g.text, 60)}
                            </option>
                          ))}
                        </select>
                        <textarea
                          className="input span-all"
                          style={{ minHeight: 56 }}
                          value={edit.draft.method}
                          onChange={(e) => edit.set('method', e.target.value)}
                          aria-label="Method used"
                        />
                        <textarea
                          className="input span-all"
                          style={{ minHeight: 56 }}
                          value={edit.draft.outcome}
                          onChange={(e) => edit.set('outcome', e.target.value)}
                          aria-label="Outcome"
                        />
                        <select
                          className="input"
                          value={edit.draft.outcome_level ?? ''}
                          onChange={(e) =>
                            edit.set('outcome_level', (e.target.value || null) as OutcomeLevel)
                          }
                          aria-label="Level of support"
                        >
                          <option value="">Not recorded</option>
                          {OUTCOME_LEVELS.map((l) => (
                            <option key={l} value={l}>
                              {OUTCOME_LEVEL_LABEL[l]}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <>
                        <div>{entry.title}</div>
                        {goal && <div className="row-sub">Goal: {shortGoal(goal.text)}</div>}
                        {entry.method && <div className="row-sub">Method: {entry.method}</div>}
                        {entry.outcome && (
                          <div className="row-sub">
                            Outcome: {entry.outcome}
                            {entry.outcome_level && (
                              <span className="pill" style={{ marginLeft: 8 }}>
                                {OUTCOME_LEVEL_LABEL[entry.outcome_level]}
                              </span>
                            )}
                          </div>
                        )}
                        <SessionSamples
                          samples={workSamples.filter((w) => w.entry_id === entry.id)}
                          onAdd={(f) => addSample.mutate({ entry, file: f })}
                          pending={addSample.isPending}
                        />
                      </>
                    )}
                  </td>

                  {student.show_hours && (
                    <td className="num">
                      {editing && edit.draft ? (
                        <input
                          className="input"
                          type="number"
                          step="0.5"
                          min="0"
                          value={edit.draft.hours}
                          onChange={(e) => edit.set('hours', e.target.value)}
                          aria-label="Hours"
                        />
                      ) : (
                        entry.hours
                      )}
                    </td>
                  )}

                  <td>
                    <RowActions
                      editing={editing}
                      onEdit={() => edit.start(entry)}
                      onSave={() => {
                        if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                      }}
                      onCancel={edit.cancel}
                      onRemove={() => remove.mutate(entry.id)}
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

/** The photographs taken during one session, and a way to add another. */
function SessionSamples({
  samples,
  onAdd,
  pending,
}: {
  samples: WorkSample[]
  onAdd: (file: File) => void
  pending: boolean
}) {
  const input = useRef<HTMLInputElement>(null)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
      {samples.map((sample) => (
        <span key={sample.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <span style={{ width: 40, height: 40, display: 'inline-block' }}>
            <Plate
              url={sample.url}
              height="40px"
              alt={sample.title}
              zoomable
              placeholder="no photo"
            />
          </span>
          <ViewButton url={sample.url} mime={sample.mime} title={sample.title} />
        </span>
      ))}
      <input
        ref={input}
        type="file"
        accept="image/*"
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
        {pending ? 'Uploading…' : samples.length ? '+ Add another photo' : '+ Add photo'}
      </button>
    </div>
  )
}
