import { useRef, useState } from 'react'
import { EmptyState, Field, Plate, RemoveButton } from '@/components/ui'
import type { NewWorkSample } from '@/data/repo'
import { useAction } from '@/data/store'
import { SUBJECT_TAG_LABEL, byDateDesc, fmtDate, today } from '@/lib/format'
import type { SubjectTag, WorkSample } from '@/lib/types'

const blank = (): NewWorkSample => ({ title: '', subject: 'ela', date: today() })

export function WorkSamplesSection({ rows }: { rows: WorkSample[] }) {
  const [form, setForm] = useState<NewWorkSample>(blank)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const add = useAction<{ input: NewWorkSample; file: File | null }>((repo, a) =>
    repo.addWorkSample(a.input, a.file),
  )
  const remove = useAction<string>((repo, id) => repo.deleteWorkSample(id))

  const sorted = [...rows].sort(byDateDesc)

  function submit() {
    if (!form.title.trim()) return
    // Clear only after the upload lands, so a failure keeps the entry to retry.
    add.mutate(
      { input: form, file },
      {
        onSuccess: () => {
          setForm({ ...blank(), subject: form.subject, date: form.date })
          setFile(null)
          if (fileInput.current) fileInput.current.value = ''
        },
      },
    )
  }

  return (
    <div className="editor">
      <div
        className="add-card"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) 170px 150px auto' }}
      >
        <Field label="What the work is">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Handwriting page — capital letters"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
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
            </select>
          )}
        </Field>
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
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={add.isPending || !form.title.trim()}
        >
          {add.isPending ? 'Adding…' : 'Add sample'}
        </button>
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
      </div>

      {sorted.length === 0 ? (
        <EmptyState>
          No samples yet. Two or three photographs per subject is plenty.
        </EmptyState>
      ) : (
        <div
          className="figure-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
        >
          {sorted.map((w) => (
            <figure key={w.id} className="figure">
              <Plate url={w.url} height="150px" placeholder="drop photo or scan" />
              <figcaption style={{ fontSize: 13, lineHeight: 1.4 }}>
                <div>{w.title}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                  {SUBJECT_TAG_LABEL[w.subject]} · {fmtDate(w.date)}
                </div>
              </figcaption>
              <RemoveButton
                onClick={() => {
                  if (
                    w.storage_path &&
                    !window.confirm(`Remove “${w.title}” and delete the uploaded photo?`)
                  ) {
                    return
                  }
                  remove.mutate(w.id)
                }}
              />
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}
