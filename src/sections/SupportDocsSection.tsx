import { useRef, useState } from 'react'
import { RowActions } from '@/components/RowActions'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field, Plate } from '@/components/ui'
import { useAction } from '@/data/store'
import { fileSizeLabel, fmtDate, today } from '@/lib/format'
import { isImage, isPdf } from '@/lib/image'
import { SUPPORT_KINDS, type SupportDocument, type SupportKind } from '@/lib/types'

interface Draft {
  title: string
  kind: SupportKind
  document_date: string
  note: string
}

const blank = (): Draft => ({ title: '', kind: 'IEP', document_date: today(), note: '' })

export function SupportDocsSection({ rows }: { rows: SupportDocument[] }) {
  const [form, setForm] = useState<Draft>(blank)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const edit = useInlineEdit<SupportDocument>()

  const add = useAction<{ input: Draft; file: File | null }>((repo, a) =>
    repo.add('supportDocuments', a.input, a.file),
  )
  const save = useAction<SupportDocument>((repo, row) =>
    repo.update('supportDocuments', row.id, {
      title: row.title,
      kind: row.kind,
      document_date: row.document_date,
      note: row.note,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('supportDocuments', id))

  function submit() {
    if (!form.title.trim() && !file) return
    add.mutate(
      { input: { ...form, title: form.title.trim() || (file?.name ?? 'Document') }, file },
      {
        onSuccess: () => {
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
                {file ? `${file.name}  ·  ${fileSizeLabel(file.size)}` : 'No file chosen yet'}
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
          {rows.map((row) => {
            const editing = edit.isEditing(row.id)
            const image = isImage(row.mime) && row.url
            return (
              <figure key={row.id} className="figure">
                <Plate
                  url={image ? row.url : null}
                  height="150px"
                  placeholder={isPdf(row.mime) ? 'PDF document attached' : 'document attached'}
                />
                {editing && edit.draft ? (
                  <div className="edit-grid">
                    <input
                      className="input span-all"
                      value={edit.draft.title}
                      onChange={(e) => edit.set('title', e.target.value)}
                      aria-label="Document title"
                    />
                    <select
                      className="input"
                      value={edit.draft.kind}
                      onChange={(e) => edit.set('kind', e.target.value as SupportKind)}
                      aria-label="Type"
                    >
                      {SUPPORT_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {k}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input"
                      type="date"
                      value={edit.draft.document_date}
                      onChange={(e) => edit.set('document_date', e.target.value)}
                      aria-label="Document date"
                    />
                    <input
                      className="input span-all"
                      value={edit.draft.note}
                      onChange={(e) => edit.set('note', e.target.value)}
                      aria-label="Why it is included"
                    />
                  </div>
                ) : (
                  <figcaption style={{ fontSize: 13, lineHeight: 1.45 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="tag tag-accent">
                        {isPdf(row.mime) ? 'PDF' : isImage(row.mime) ? 'Image' : (row.mime ?? 'File')}
                      </span>
                      <span>{row.title}</span>
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                      {[row.kind, fmtDate(row.document_date), row.file_name]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>{row.note}</div>
                  </figcaption>
                )}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {!editing && row.url && (
                    <a
                      className="btn btn-ghost"
                      style={{ fontSize: 12 }}
                      href={row.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open
                    </a>
                  )}
                  <RowActions
                    editing={editing}
                    onEdit={() => edit.start(row)}
                    onSave={() => {
                      if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                    }}
                    onCancel={edit.cancel}
                    onRemove={() => remove.mutate(row.id)}
                    removeConfirm={
                      row.storage_path
                        ? `Remove “${row.title}” and delete the uploaded file?`
                        : undefined
                    }
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
