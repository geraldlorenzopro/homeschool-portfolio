import { useState } from 'react'
import { DragHandle, RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field } from '@/components/ui'
import { useAction } from '@/data/store'
import {
  GOAL_STATUSES,
  GOAL_STATUS_LABEL,
  type Area,
  type Entry,
  type Goal,
  type GoalSource,
  type GoalStatus,
} from '@/lib/types'

interface Draft {
  area_id: string
  text: string
  status: GoalStatus
  source: GoalSource
}

export function GoalsSection({
  areas,
  goals,
  entries,
}: {
  areas: Area[]
  goals: Goal[]
  entries: Entry[]
}) {
  const [form, setForm] = useState<Draft>({
    area_id: areas[0]?.id ?? '',
    text: '',
    status: 'not_started',
    source: 'iep',
  })
  const edit = useInlineEdit<Goal>()

  const add = useAction<Draft>((repo, input) => repo.add('goals', input))
  const save = useAction<Goal>((repo, row) =>
    repo.update('goals', row.id, {
      area_id: row.area_id,
      text: row.text,
      status: row.status,
      source: row.source,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('goals', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('goals', ids))

  const drag = useDragOrder(
    goals.map((g) => g.id),
    (ids) => reorder.mutate(ids),
  )

  function submit() {
    if (!form.text.trim() || !form.area_id) return
    // Area, status and source stay put — goals get entered in runs.
    add.mutate(form, { onSuccess: () => setForm({ ...form, text: '' }) })
  }

  if (areas.length === 0) {
    return <EmptyState>Add an area first — every goal belongs to one.</EmptyState>
  }

  return (
    <div className="editor">
      <div className="add-card" style={{ gridTemplateColumns: 'minmax(200px, 1fr) 170px 150px' }}>
        <Field label="Goal" span>
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 64 }}
              placeholder="Given a decodable text, the student will read CVC words with 80% accuracy across three consecutive sessions."
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
          )}
        </Field>
        <Field label="Area">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.area_id}
              onChange={(e) => setForm({ ...form, area_id: e.target.value })}
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Status">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as GoalStatus })}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GOAL_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Where it came from">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value as GoalSource })}
            >
              <option value="iep">From the official IEP</option>
              <option value="parent">Written by the parent</option>
            </select>
          )}
        </Field>
        <button
          type="button"
          className="btn btn-primary span-all justify-start"
          onClick={submit}
          disabled={!form.text.trim()}
        >
          Add goal
        </button>
      </div>

      {goals.length === 0 ? (
        <EmptyState>
          No goals yet. Copy them from the IEP, or write your own for the year.
        </EmptyState>
      ) : (
        areas
          .filter((area) => goals.some((g) => g.area_id === area.id))
          .map((area) => {
            const rows = goals.filter((g) => g.area_id === area.id)
            return (
              <section key={area.id}>
                <div className="area-heading">
                  <h2>{area.label}</h2>
                  <span style={{ fontSize: 12, opacity: 0.6 }}>
                    {rows.length} goal{rows.length === 1 ? '' : 's'}
                  </span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }} />
                      <th>Goal</th>
                      <th style={{ width: 120 }}>Status</th>
                      <th style={{ width: 90 }}>Sessions</th>
                      <th style={{ width: 150 }} />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((goal) => {
                      const editing = edit.isEditing(goal.id)
                      const sessions = entries.filter((e) => e.goal_id === goal.id).length
                      return (
                        <tr
                          key={goal.id}
                          data-editing={editing || undefined}
                          {...drag.handlers(goal.id)}
                        >
                          <td>
                            <DragHandle />
                          </td>
                          <td className="goal-text">
                            {editing && edit.draft ? (
                              <div className="edit-grid">
                                <textarea
                                  className="input span-all"
                                  style={{ minHeight: 64 }}
                                  value={edit.draft.text}
                                  onChange={(e) => edit.set('text', e.target.value)}
                                  aria-label="Goal"
                                />
                                <select
                                  className="input"
                                  value={edit.draft.area_id}
                                  onChange={(e) => edit.set('area_id', e.target.value)}
                                  aria-label="Area"
                                >
                                  {areas.map((a) => (
                                    <option key={a.id} value={a.id}>
                                      {a.label}
                                    </option>
                                  ))}
                                </select>
                                <select
                                  className="input"
                                  value={edit.draft.source}
                                  onChange={(e) =>
                                    edit.set('source', e.target.value as GoalSource)
                                  }
                                  aria-label="Where it came from"
                                >
                                  <option value="iep">From the official IEP</option>
                                  <option value="parent">Written by the parent</option>
                                </select>
                              </div>
                            ) : (
                              <>
                                <div>{goal.text}</div>
                                <div style={{ marginTop: 6 }}>
                                  <span className="pill" data-source={goal.source}>
                                    {goal.source === 'iep' ? 'From the IEP' : 'Parent-written'}
                                  </span>
                                </div>
                              </>
                            )}
                          </td>
                          <td>
                            {editing && edit.draft ? (
                              <select
                                className="input"
                                value={edit.draft.status}
                                onChange={(e) => edit.set('status', e.target.value as GoalStatus)}
                                aria-label="Status"
                              >
                                {GOAL_STATUSES.map((s) => (
                                  <option key={s} value={s}>
                                    {GOAL_STATUS_LABEL[s]}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="pill" data-status={goal.status}>
                                {GOAL_STATUS_LABEL[goal.status]}
                              </span>
                            )}
                          </td>
                          <td className="num">{sessions}</td>
                          <td>
                            <RowActions
                              editing={editing}
                              onEdit={() => edit.start(goal)}
                              onSave={() => {
                                if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                              }}
                              onCancel={edit.cancel}
                              onRemove={() => remove.mutate(goal.id)}
                              removeConfirm={
                                sessions
                                  ? `This goal has ${sessions} recorded session(s). They stay in the log but lose their link to it. Continue?`
                                  : undefined
                              }
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </section>
            )
          })
      )}
    </div>
  )
}
