import { useState } from 'react'
import { EmptyState, Field, RemoveButton } from '@/components/ui'
import { useAction } from '@/data/store'
import type { NewCurriculum } from '@/data/repo'
import { SUBJECT_TAG_LABEL } from '@/lib/format'
import type { Curriculum, SubjectTag } from '@/lib/types'

const BLANK: NewCurriculum = { title: '', publisher: '', subject: 'ela', usage: '' }

export function CurriculumSection({ rows }: { rows: Curriculum[] }) {
  const [form, setForm] = useState<NewCurriculum>(BLANK)
  const add = useAction<NewCurriculum>((repo, input) => repo.addCurriculum(input))
  const remove = useAction<string>((repo, id) => repo.deleteCurriculum(id))

  function submit() {
    if (!form.title.trim()) return
    add.mutate(form, {
      // Subject stays put — most people enter a run of one subject at a time.
      onSuccess: () => setForm({ ...BLANK, subject: form.subject }),
    })
  }

  return (
    <div className="editor">
      <div
        className="add-card"
        style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(200px, 1fr)' }}
      >
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
        <Field label="Subject">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value as SubjectTag })}
            >
              <option value="ela">Language Arts</option>
              <option value="math">Mathematics</option>
              <option value="other">Multiple subjects</option>
            </select>
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
              <th>Curriculum</th>
              <th style={{ width: 210 }}>Publisher</th>
              <th style={{ width: 150 }}>Subject</th>
              <th>How it was used</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.title}</td>
                <td style={{ opacity: 0.75 }}>{c.publisher}</td>
                <td style={{ opacity: 0.75 }}>{SUBJECT_TAG_LABEL[c.subject]}</td>
                <td style={{ opacity: 0.6, fontSize: 13 }}>{c.usage}</td>
                <td>
                  <RemoveButton onClick={() => remove.mutate(c.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
