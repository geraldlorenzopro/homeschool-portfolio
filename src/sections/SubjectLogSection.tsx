import { useState } from 'react'
import { EmptyState, Field, RemoveButton } from '@/components/ui'
import type { NewActivity } from '@/data/repo'
import { useAction } from '@/data/store'
import { byDateDesc, fmtDate, today } from '@/lib/format'
import type { Activity } from '@/lib/types'

interface Draft {
  date: string
  title: string
  notes: string
  hours: string
}

const blank = (): Draft => ({ date: today(), title: '', notes: '', hours: '' })

export function SubjectLogSection({
  subjectKey,
  subjectLabel,
  rows,
}: {
  subjectKey: string
  subjectLabel: string
  rows: Activity[]
}) {
  const [form, setForm] = useState<Draft>(blank)
  const add = useAction<NewActivity>((repo, input) => repo.addActivity(input))
  const remove = useAction<string>((repo, id) => repo.deleteActivity(id))

  const sorted = [...rows].sort(byDateDesc)

  function submit() {
    if (!form.title.trim()) return
    add.mutate(
      { ...form, subject_key: subjectKey },
      // The date is sticky — a day's activities get logged together.
      { onSuccess: () => setForm({ ...blank(), date: form.date }) },
    )
  }

  return (
    <div className="editor">
      <div
        className="add-card"
        style={{ display: 'block' }}
      >
        <div className="kicker" style={{ marginBottom: 14 }}>
          Add an activity
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '150px minmax(0, 1fr) 90px',
            gap: 12,
            alignItems: 'end',
          }}
        >
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
          <Field label="What was covered">
            {(id) => (
              <input
                id={id}
                className="input"
                placeholder="e.g. Short vowel word families"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            )}
          </Field>
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
          <Field label="Materials, method, outcome" span>
            {(id) => (
              <textarea
                id={id}
                className="input"
                style={{ minHeight: 64 }}
                placeholder="Explode the Code p. 22–26; read aloud; mastered -at and -op families."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            )}
          </Field>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 14 }}
          onClick={submit}
          disabled={!form.title.trim()}
        >
          Add to {subjectLabel}
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState>
          Nothing logged for {subjectLabel} yet. Each entry becomes a dated row in the portfolio.
        </EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 120 }}>Date</th>
              <th>Activity</th>
              <th style={{ width: 70 }}>Hours</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.id}>
                <td className="nowrap" style={{ opacity: 0.7 }}>
                  {fmtDate(e.date)}
                </td>
                <td>
                  <div>{e.title}</div>
                  <div className="row-sub">{e.notes}</div>
                </td>
                <td className="num">{e.hours}</td>
                <td>
                  <RemoveButton onClick={() => remove.mutate(e.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
