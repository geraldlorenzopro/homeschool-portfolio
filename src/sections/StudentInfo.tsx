import { useEffect, useRef, useState } from 'react'
import { Field } from '@/components/ui'
import { useAction } from '@/data/store'
import type { Student, StudentField } from '@/lib/types'

type Patch = Partial<Omit<Student, 'id'>>

const TEXT_FIELDS: { key: StudentField; label: string }[] = [
  { key: 'grade', label: 'Grade level' },
  { key: 'school_year', label: 'School year' },
  { key: 'parent_name', label: 'Parent / instructor' },
  { key: 'county', label: 'County of registration' },
  { key: 'evaluator', label: 'Evaluator' },
]

/** The three switches that decide what the whole portfolio records and prints. */
const TOGGLES: { key: StudentField; label: string; hint: string }[] = [
  {
    key: 'show_dates',
    label: 'Record dates',
    hint: 'Florida asks for a log made contemporaneously with the instruction, and the date is what shows that. Turning this off removes the field everywhere.',
  },
  {
    key: 'show_hours',
    label: 'Record hours',
    hint: 'The statute does not ask for hours. Off unless you want them.',
  },
  {
    key: 'show_activity_log',
    label: 'Include the plain activity log in the document',
    hint: 'An extra chronological list alongside the goal-based record. Off by default.',
  },
]

export function StudentInfo({ student }: { student: Student }) {
  const save = useAction<Patch>((repo, patch) => repo.updateStudent(patch))
  const [draft, setDraft] = useState(student)
  const pending = useRef<Patch>({})
  const timer = useRef<number | undefined>(undefined)

  // Adopt whatever the server now holds, except for fields with an unsaved
  // edit still in flight — so an outside change shows up without yanking
  // characters out from under the typist.
  useEffect(() => {
    setDraft((d) => {
      const merged = { ...student }
      for (const key of Object.keys(pending.current) as StudentField[]) {
        merged[key] = d[key] as never
      }
      return merged
    })
  }, [student])

  function flush() {
    const patch = pending.current
    pending.current = {}
    if (Object.keys(patch).length) save.mutate(patch)
  }

  // Leaving the section (or the page) must not drop a half-second of typing.
  const flushRef = useRef(flush)
  flushRef.current = flush
  useEffect(() => {
    const onHide = () => flushRef.current()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.clearTimeout(timer.current)
      flushRef.current()
    }
  }, [])

  /** Text debounces at 500 ms; dates and switches commit on change. */
  function set(key: StudentField, value: string | boolean, immediate = false) {
    setDraft((d) => ({ ...d, [key]: value }))
    pending.current[key] = value as never
    window.clearTimeout(timer.current)
    if (immediate) flush()
    else timer.current = window.setTimeout(flush, 500)
  }

  return (
    <div className="editor">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 18,
          maxWidth: 680,
        }}
      >
        <Field label="Student name">
          {(id) => (
            <input
              id={id}
              className="input"
              value={draft.name}
              onChange={(e) => set('name', e.target.value)}
              onBlur={flush}
            />
          )}
        </Field>

        <Field label="Date of birth">
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              value={draft.dob}
              onChange={(e) => set('dob', e.target.value, true)}
            />
          )}
        </Field>

        {TEXT_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            {(id) => (
              <input
                id={id}
                className="input"
                value={String(draft[f.key] ?? '')}
                onChange={(e) => set(f.key, e.target.value)}
                onBlur={flush}
              />
            )}
          </Field>
        ))}

        <Field label="Evaluation date">
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              value={draft.evaluation_date}
              onChange={(e) => set('evaluation_date', e.target.value, true)}
            />
          )}
        </Field>

        <Field label="Instructor's statement of the year" span>
          {(id) => (
            <textarea
              id={id}
              className="input"
              value={draft.statement}
              onChange={(e) => set('statement', e.target.value)}
              onBlur={flush}
            />
          )}
        </Field>
      </div>

      <div style={{ maxWidth: 680 }}>
        <div className="kicker" style={{ marginBottom: 10 }}>
          What this portfolio records
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {TOGGLES.map((t) => (
            <label key={t.key} className="switch">
              <input
                type="checkbox"
                checked={Boolean(draft[t.key])}
                onChange={(e) => set(t.key, e.target.checked, true)}
              />
              <span>
                {t.label}
                <span style={{ display: 'block', fontSize: 12, opacity: 0.65, marginTop: 2 }}>
                  {t.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
