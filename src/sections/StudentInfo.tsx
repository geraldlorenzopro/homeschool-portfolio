import { useEffect, useRef, useState } from 'react'
import { Field } from '@/components/ui'
import { useAction } from '@/data/store'
import type { Student, StudentField } from '@/lib/types'

type Patch = Partial<Omit<Student, 'id'>>

const TEXT_FIELDS: { key: StudentField; label: string }[] = [
  { key: 'name', label: 'Student name' },
  { key: 'grade', label: 'Grade level' },
  { key: 'school_year', label: 'School year' },
  { key: 'parent_name', label: 'Parent / instructor' },
  { key: 'county', label: 'County of registration' },
  { key: 'evaluator', label: 'Evaluator' },
]

export function StudentInfo({ student }: { student: Student }) {
  const save = useAction<Patch>((repo, patch) => repo.updateStudent(patch))
  const [draft, setDraft] = useState(student)
  const pending = useRef<Patch>({})
  const timer = useRef<number | undefined>(undefined)

  // Adopt whatever the server now holds, except for fields with an unsaved
  // edit still in flight — so "Reset to sample data" and any other outside
  // change show up, without yanking characters out from under the typist.
  useEffect(() => {
    setDraft((d) => {
      const merged = { ...student }
      for (const key of Object.keys(pending.current) as StudentField[]) {
        merged[key] = d[key]
      }
      return merged
    })
  }, [student])

  function flush() {
    const patch = pending.current
    pending.current = {}
    if (Object.keys(patch).length) save.mutate(patch)
  }

  // Leaving the section (or the page) must not drop a half-second of typing:
  // commit whatever the debounce is still holding.
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

  /** Text debounces at 500 ms; dates commit on change. */
  function set(key: StudentField, value: string, immediate = false) {
    setDraft((d) => ({ ...d, [key]: value }))
    pending.current[key] = value
    window.clearTimeout(timer.current)
    if (immediate) flush()
    else timer.current = window.setTimeout(flush, 500)
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
        maxWidth: 680,
      }}
    >
      <Field label={TEXT_FIELDS[0].label}>
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

      {TEXT_FIELDS.slice(1).map((f) => (
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
  )
}
