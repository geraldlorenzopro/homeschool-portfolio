import { useMemo, useRef, useState } from 'react'
import { Field, RemoveButton } from '@/components/ui'
import type { Repo } from '@/data/repo'
import { useAction } from '@/data/store'
import { SUBJECT_TAG_LABEL, fmtDate, subjectLabel, sumHours, today } from '@/lib/format'
import type { Portfolio, SubjectTag } from '@/lib/types'

type Kind = 'lesson' | 'book' | 'sample'

const KINDS: { key: Kind; label: string }[] = [
  { key: 'lesson', label: 'Lesson or activity' },
  { key: 'book', label: 'Book finished' },
  { key: 'sample', label: 'Work sample' },
]

const COPY: Record<Kind, { title: string; placeholder: string; destination: string }> = {
  lesson: {
    title: 'What was covered',
    placeholder: 'Measured the kitchen in shoe-lengths',
    destination: 'Files into: Log of educational activities',
  },
  book: {
    title: 'Book title',
    placeholder: 'Owl Moon',
    destination: 'Files into: Reading list',
  },
  sample: {
    title: 'What the work is',
    placeholder: 'Handwriting page — capital letters',
    destination: 'Files into: Samples of work',
  },
}

interface Draft {
  date: string
  title: string
  notes: string
  hours: string
  subject: SubjectTag
  author: string
}

const blank = (): Draft => ({
  date: today(),
  title: '',
  notes: '',
  hours: '',
  subject: 'ela',
  author: '',
})

interface FeedEntry {
  id: string
  kindLabel: string
  date: string
  title: string
  meta: string
  remove: () => void
}

export function QuickLog({ portfolio }: { portfolio: Portfolio }) {
  const [kind, setKind] = useState<Kind>('lesson')
  const [form, setForm] = useState<Draft>(blank)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const save = useAction<{ kind: Kind; form: Draft; file: File | null }>(
    (repo, a) => fileEntry(repo, a.kind, a.form, a.file),
  )
  const removeActivity = useAction<string>((repo, id) => repo.deleteActivity(id))
  const removeBook = useAction<string>((repo, id) => repo.deleteBook(id))
  const removeSample = useAction<string>((repo, id) => repo.deleteWorkSample(id))

  const { subjects, activities, books, workSamples } = portfolio

  const feed = useMemo<FeedEntry[]>(() => {
    const rows: FeedEntry[] = [
      ...activities.map((a) => ({
        id: a.id,
        kindLabel: subjectLabel(a.subject_key, subjects),
        date: a.date,
        title: a.title,
        meta: a.notes + (a.hours ? `  ·  ${a.hours} h` : ''),
        remove: () => removeActivity.mutate(a.id),
      })),
      ...books.map((b) => ({
        id: b.id,
        kindLabel: 'Reading',
        date: b.finished_on,
        title: b.title,
        meta: [b.author, b.how_read].filter(Boolean).join('  ·  '),
        remove: () => removeBook.mutate(b.id),
      })),
      ...workSamples.map((w) => ({
        id: w.id,
        kindLabel: 'Work sample',
        date: w.date,
        title: w.title,
        meta:
          SUBJECT_TAG_LABEL[w.subject] + (w.url ? '  ·  photo attached' : '  ·  no photo yet'),
        remove: () => removeSample.mutate(w.id),
      })),
    ]
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [activities, books, workSamples, subjects, removeActivity, removeBook, removeSample])

  const totalHours = sumHours(activities)
  const copy = COPY[kind]

  function submit() {
    if (!form.title.trim()) return
    // Clear only on success — a failed save must not swallow what was typed.
    save.mutate(
      { kind, form, file },
      {
        onSuccess: () => {
          // Date and subject are sticky: a day's entries share both.
          setForm({ ...blank(), date: form.date, subject: form.subject })
          setFile(null)
          if (fileInput.current) fileInput.current.value = ''
        },
      },
    )
  }

  return (
    <div className="quick-wrap">
      <div className="kicker">Flow B</div>
      <h1 className="panel-title" style={{ margin: '6px 0 4px' }}>
        One running log
      </h1>
      <p className="panel-hint" style={{ maxWidth: '62ch' }}>
        Write down whatever happened today — a lesson, a book finished, a photo of the work. Each
        entry files itself into the right portfolio section, so nothing has to be organized twice.
      </p>

      <div className="quick-card">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {KINDS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="tab"
              aria-pressed={kind === t.key}
              onClick={() => setKind(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="quick-fields">
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

          <Field label={copy.title}>
            {(id) => (
              <input
                id={id}
                className="input"
                placeholder={copy.placeholder}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            )}
          </Field>

          <Field label={kind === 'book' ? 'Author' : 'Subject'}>
            {(id) =>
              kind === 'book' ? (
                <input
                  id={id}
                  className="input"
                  placeholder="Author"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              ) : (
                <select
                  id={id}
                  className="input"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value as SubjectTag })}
                >
                  {subjects.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )
            }
          </Field>

          <Field label="Notes" span>
            {(id) => (
              <textarea
                id={id}
                className="input"
                style={{ minHeight: 60 }}
                placeholder="A sentence is plenty — it becomes the portfolio description."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            )}
          </Field>

          {kind === 'lesson' && (
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

          {kind === 'sample' && (
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
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 16 }}>
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={save.isPending || !form.title.trim()}
          >
            {save.isPending ? 'Saving…' : 'Save to portfolio'}
          </button>
          <span style={{ fontSize: 12, opacity: 0.6 }}>{copy.destination}</span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          margin: '34px 0 10px',
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 400, margin: 0 }}>This year so far</h2>
        <span style={{ fontSize: 12, opacity: 0.6 }}>
          {feed.length} entries · {books.length} books · {totalHours} hours
        </span>
      </div>
      <hr className="hr" style={{ margin: '0 0 6px' }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {feed.length === 0 ? (
          <p className="empty-state">Nothing logged yet — the first entry starts the year.</p>
        ) : (
          feed.map((e) => (
            <div key={e.id} className="feed-row">
              <div className="num" style={{ fontSize: 12, opacity: 0.6, paddingTop: 3 }}>
                {fmtDate(e.date)}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span className="tag tag-accent">{e.kindLabel}</span>
                  <span>{e.title}</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.65, marginTop: 4, lineHeight: 1.5 }}>
                  {e.meta}
                </div>
              </div>
              <RemoveButton onClick={e.remove} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}

/** Both flows write the same tables — this is the only place they diverge. */
function fileEntry(repo: Repo, kind: Kind, form: Draft, file: File | null): Promise<void> {
  if (kind === 'book') {
    return repo.addBook({
      title: form.title,
      author: form.author,
      finished_on: form.date,
      how_read: form.notes || 'Read aloud together',
    })
  }
  if (kind === 'sample') {
    return repo.addWorkSample(
      { title: form.title, subject: form.subject, date: form.date },
      file,
    )
  }
  return repo.addActivity({
    subject_key: form.subject,
    date: form.date,
    title: form.title,
    notes: form.notes,
    hours: form.hours,
  })
}
