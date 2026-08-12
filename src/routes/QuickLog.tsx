import { useMemo, useRef, useState } from 'react'
import { Field, RemoveButton } from '@/components/ui'
import type { Repo } from '@/data/repo'
import { useAction } from '@/data/store'
import { areaLabel, fmtDate, shortGoal, sumHours, today } from '@/lib/format'
import {
  OUTCOME_LEVELS,
  OUTCOME_LEVEL_LABEL,
  type OutcomeLevel,
  type Portfolio,
} from '@/lib/types'

type Kind = 'session' | 'book' | 'sample'

const KINDS: { key: Kind; label: string }[] = [
  { key: 'session', label: 'Session or activity' },
  { key: 'book', label: 'Book finished' },
  { key: 'sample', label: 'Work sample' },
]

const DESTINATION: Record<Kind, string> = {
  session: 'Files into: Sessions',
  book: 'Files into: Reading list',
  sample: 'Files into: Work samples',
}

const TITLE_LABEL: Record<Kind, string> = {
  session: 'What was covered',
  book: 'Book title',
  sample: 'What the work is',
}

interface Draft {
  date: string
  title: string
  area_id: string
  goal_id: string | null
  method: string
  outcome: string
  outcome_level: OutcomeLevel | null
  hours: string
  author: string
}

interface FeedEntry {
  id: string
  kindLabel: string
  date: string
  title: string
  meta: string
  remove: () => void
}

export function QuickLog({ portfolio }: { portfolio: Portfolio }) {
  const { student, areas, goals, entries, books, workSamples } = portfolio

  const blank = (): Draft => ({
    date: today(),
    title: '',
    area_id: areas[0]?.id ?? '',
    goal_id: null,
    method: '',
    outcome: '',
    outcome_level: null,
    hours: '',
    author: '',
  })

  const [kind, setKind] = useState<Kind>('session')
  const [form, setForm] = useState<Draft>(blank)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const save = useAction<{ kind: Kind; form: Draft; file: File | null }>((repo, a) =>
    fileEntry(repo, a.kind, a.form, a.file),
  )
  const removeEntry = useAction<string>((repo, id) => repo.remove('entries', id))
  const removeBook = useAction<string>((repo, id) => repo.remove('books', id))
  const removeSample = useAction<string>((repo, id) => repo.remove('workSamples', id))

  const feed = useMemo<FeedEntry[]>(() => {
    const rows: FeedEntry[] = [
      ...entries.map((e) => {
        const goal = goals.find((g) => g.id === e.goal_id)
        return {
          id: e.id,
          kindLabel: areaLabel(e.area_id, areas),
          date: e.date,
          title: e.title,
          meta: [
            goal ? `Goal: ${shortGoal(goal.text, 60)}` : null,
            e.outcome || null,
            e.outcome_level ? OUTCOME_LEVEL_LABEL[e.outcome_level] : null,
            student.show_hours && e.hours ? `${e.hours} h` : null,
          ]
            .filter(Boolean)
            .join('  ·  '),
          remove: () => removeEntry.mutate(e.id),
        }
      }),
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
          areaLabel(w.area_id, areas) + (w.url ? '  ·  photo attached' : '  ·  no photo yet'),
        remove: () => removeSample.mutate(w.id),
      })),
    ]
    return rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [entries, books, workSamples, areas, goals, student.show_hours, removeEntry, removeBook, removeSample])

  const goalsFor = (areaId: string) => goals.filter((g) => g.area_id === areaId)
  const totalHours = sumHours(entries)

  function submit() {
    if (!form.title.trim()) return
    save.mutate(
      { kind, form, file },
      {
        onSuccess: () => {
          // Date, area and goal are sticky: a day's entries share them.
          setForm({
            ...blank(),
            date: form.date,
            area_id: form.area_id,
            goal_id: form.goal_id,
          })
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
        Write down whatever happened today — a session, a book finished, a photo of the work. Each
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

          <Field label={TITLE_LABEL[kind]}>
            {(id) => (
              <input
                id={id}
                className="input"
                placeholder={
                  kind === 'book' ? 'Owl Moon' : 'Short vowel word families'
                }
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            )}
          </Field>

          <Field label={kind === 'book' ? 'Author' : 'Area'}>
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
                  value={form.area_id}
                  onChange={(e) =>
                    setForm({ ...form, area_id: e.target.value, goal_id: null })
                  }
                >
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              )
            }
          </Field>

          {kind !== 'book' && (
            <Field label="Goal worked on" span>
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
          )}

          {kind === 'session' && (
            <>
              <Field label="Method used" span>
                {(id) => (
                  <textarea
                    id={id}
                    className="input"
                    style={{ minHeight: 56 }}
                    placeholder="How you taught it — materials, steps, supports."
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
                    style={{ minHeight: 56 }}
                    placeholder="A sentence is plenty — it becomes the portfolio description."
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
                      setForm({
                        ...form,
                        outcome_level: (e.target.value || null) as OutcomeLevel | null,
                      })
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
            </>
          )}

          {kind === 'book' && (
            <Field label="How it was read" span>
              {(id) => (
                <input
                  id={id}
                  className="input"
                  placeholder="Read aloud together / read independently"
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
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
          <span style={{ fontSize: 12, opacity: 0.6 }}>{DESTINATION[kind]}</span>
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
          {feed.length} entries · {books.length} books
          {student.show_hours ? ` · ${totalHours} hours` : ''}
        </span>
      </div>
      <hr className="hr" style={{ margin: '0 0 6px' }} />

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {feed.length === 0 ? (
          <p className="empty-state">Nothing logged yet — the first entry starts the year.</p>
        ) : (
          feed.map((e) => (
            <div key={e.id} className="feed-row">
              {student.show_dates && (
                <div className="num" style={{ fontSize: 12, opacity: 0.6, paddingTop: 3 }}>
                  {fmtDate(e.date)}
                </div>
              )}
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
async function fileEntry(repo: Repo, kind: Kind, form: Draft, file: File | null): Promise<void> {
  if (kind === 'book') {
    await repo.add('books', {
      title: form.title,
      author: form.author,
      finished_on: form.date,
      how_read: form.method || 'Read aloud together',
    })
    return
  }
  if (kind === 'sample') {
    await repo.add(
      'workSamples',
      {
        title: form.title,
        area_id: form.area_id || null,
        goal_id: form.goal_id,
        entry_id: null,
        date: form.date,
      },
      file,
    )
    return
  }
  await repo.add('entries', {
    area_id: form.area_id,
    goal_id: form.goal_id,
    title: form.title,
    method: form.method,
    outcome: form.outcome,
    outcome_level: form.outcome_level,
    date: form.date,
    hours: form.hours,
  })
}
