import { useRef, useState } from 'react'
import { EmptyState, Field, Plate, RemoveButton } from '@/components/ui'
import type { NewSupportDocument } from '@/data/repo'
import { useAction } from '@/data/store'
import { fileSizeLabel, fmtDate, today } from '@/lib/format'
import { isImage, isPdf } from '@/lib/image'
import { SUPPORT_KINDS, type SupportDocument, type SupportKind } from '@/lib/types'

const blank = (): NewSupportDocument => ({
  title: '',
  kind: 'IEP',
  document_date: today(),
  note: '',
})

export function SupportDocsSection({ rows }: { rows: SupportDocument[] }) {
  const [form, setForm] = useState<NewSupportDocument>(blank)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const add = useAction<{ input: NewSupportDocument; file: File | null }>((repo, a) =>
    repo.addSupportDocument(a.input, a.file),
  )
  const remove = useAction<string>((repo, id) => repo.deleteSupportDocument(id))

  function submit() {
    if (!form.title.trim() && !file) return
    // Only clear once the upload has actually landed — a failed upload must
    // leave the typed-in details on screen to retry with.
    add.mutate(
      { input: form, file },
      {
        onSuccess: () => {
          // Type and date stay sticky; a batch of documents usually shares both.
          setForm({ ...blank(), kind: form.kind, document_date: form.document_date })
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
        style={{ gridTemplateColumns: 'minmax(200px, 1fr) minmax(160px, 220px)' }}
      >
        <Field label="Document title" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Individualized Education Program (IEP) 2025–2026"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>
        <Field label="Type">
          {(id) => (
            <select
              id={id}
              className="input"
              value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as SupportKind })}
            >
              {SUPPORT_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Document date">
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              value={form.document_date}
              onChange={(e) => setForm({ ...form, document_date: e.target.value })}
            />
          )}
        </Field>
        <Field label="Why it is included" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Goals and accommodations carried into the home program"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          )}
        </Field>
        <Field label="File (PDF or image)" span>
          {(id) => (
            <>
              <input
                id={id}
                ref={fileInput}
                className="input"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <span className="file-hint">
                {file
                  ? `${file.name}  ·  ${fileSizeLabel(file.size)}`
                  : 'No file chosen yet'}
              </span>
            </>
          )}
        </Field>
        <button
          type="button"
          className="btn btn-primary span-all justify-start"
          onClick={submit}
          disabled={add.isPending || (!form.title.trim() && !file)}
        >
          {add.isPending ? 'Attaching…' : 'Attach document'}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          Nothing attached yet. Upload the IEP, a 504 plan, therapy plans or prior evaluations.
        </EmptyState>
      ) : (
        <div
          className="figure-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        >
          {rows.map((f) => {
            const image = isImage(f.mime) && f.url
            return (
              <figure key={f.id} className="figure">
                <Plate
                  url={image ? f.url : null}
                  height="150px"
                  placeholder={isPdf(f.mime) ? 'PDF document attached' : 'document attached'}
                />
                <figcaption style={{ fontSize: 13, lineHeight: 1.45 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="tag tag-accent">
                      {isPdf(f.mime) ? 'PDF' : isImage(f.mime) ? 'Image' : (f.mime ?? 'File')}
                    </span>
                    <span>{f.title}</span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                    {[f.kind, fmtDate(f.document_date), f.file_name].filter(Boolean).join('  ·  ')}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{f.note}</div>
                </figcaption>
                <div style={{ display: 'flex', gap: 8 }}>
                  {f.url && (
                    <a
                      className="btn btn-ghost"
                      style={{ fontSize: 12 }}
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  )}
                  <RemoveButton
                    onClick={() => {
                      // Uploaded files are deleted from storage too, so confirm.
                      if (
                        f.storage_path &&
                        !window.confirm(`Remove “${f.title}” and delete the uploaded file?`)
                      ) {
                        return
                      }
                      remove.mutate(f.id)
                    }}
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
