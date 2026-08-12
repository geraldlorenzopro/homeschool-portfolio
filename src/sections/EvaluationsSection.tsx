import { useRef, useState } from 'react'
import { DragHandle, RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { EmptyState, Field, FilePlate, FilePreview } from '@/components/ui'
import { useAction } from '@/data/store'
import { fileSizeLabel, fmtDate, today } from '@/lib/format'
import { EVALUATION_KINDS, type Evaluation, type EvaluationKind } from '@/lib/types'

interface Draft {
  title: string
  kind: EvaluationKind
  evaluation_date: string
  performed_by: string
  summary: string
}

const blank = (): Draft => ({
  title: '',
  kind: 'Psychoeducational',
  evaluation_date: today(),
  performed_by: '',
  summary: '',
})

export function EvaluationsSection({ rows }: { rows: Evaluation[] }) {
  const [form, setForm] = useState<Draft>(blank)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const edit = useInlineEdit<Evaluation>()

  const add = useAction<{ input: Draft; file: File | null }>((repo, a) =>
    repo.add('evaluations', a.input, a.file),
  )
  const save = useAction<Evaluation>((repo, row) =>
    repo.update('evaluations', row.id, {
      title: row.title,
      kind: row.kind,
      evaluation_date: row.evaluation_date,
      performed_by: row.performed_by,
      summary: row.summary,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('evaluations', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('evaluations', ids))

  const drag = useDragOrder(
    rows.map((r) => r.id),
    (ids) => reorder.mutate(ids),
  )

  function submit() {
    if (!form.title.trim() && !file) return
    add.mutate(
      { input: { ...form, title: form.title.trim() || (file?.name ?? 'Evaluation') }, file },
      {
        onSuccess: () => {
          setForm({ ...blank(), kind: form.kind, evaluation_date: form.evaluation_date })
          setFile(null)
          if (fileInput.current) fileInput.current.value = ''
        },
      },
    )
  }

  return (
    <div className="editor">
      <div className="add-card" style={{ gridTemplateColumns: 'minmax(0, 1fr) 200px 150px' }}>
        <Field label="Evaluation title" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="District psychoeducational evaluation"
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
              onChange={(e) => setForm({ ...form, kind: e.target.value as EvaluationKind })}
            >
              {EVALUATION_KINDS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Performed by">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Miami-Dade County Public Schools"
              value={form.performed_by}
              onChange={(e) => setForm({ ...form, performed_by: e.target.value })}
            />
          )}
        </Field>
        <Field label="Date">
          {(id) => (
            <input
              id={id}
              className="input"
              type="date"
              value={form.evaluation_date}
              onChange={(e) => setForm({ ...form, evaluation_date: e.target.value })}
            />
          )}
        </Field>
        <Field label="Summary of results" span>
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 64 }}
              placeholder="What the evaluation found, and what it recommended."
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
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
              <FilePreview file={file} />
            </>
          )}
        </Field>
        <button
          type="button"
          className="btn btn-primary span-all justify-start"
          onClick={submit}
          disabled={add.isPending || (!form.title.trim() && !file)}
        >
          {add.isPending ? 'Adding…' : 'Add evaluation'}
        </button>
      </div>

      {rows.length === 0 ? (
        <EmptyState>
          No evaluations recorded. Add any psychoeducational, speech or therapy evaluation done
          recently.
        </EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>Evaluation</th>
              <th style={{ width: 170 }}>Type</th>
              <th style={{ width: 120 }}>Date</th>
              <th style={{ width: 150 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const editing = edit.isEditing(row.id)
              return (
                <tr key={row.id} data-editing={editing || undefined} {...drag.handlers(row.id)}>
                  <td>
                    <DragHandle />
                  </td>
                  <td>
                    {editing && edit.draft ? (
                      <div className="edit-grid">
                        <input
                          className="input span-all"
                          value={edit.draft.title}
                          onChange={(e) => edit.set('title', e.target.value)}
                          aria-label="Evaluation title"
                        />
                        <input
                          className="input"
                          value={edit.draft.performed_by}
                          onChange={(e) => edit.set('performed_by', e.target.value)}
                          aria-label="Performed by"
                        />
                        <textarea
                          className="input span-all"
                          style={{ minHeight: 60 }}
                          value={edit.draft.summary}
                          onChange={(e) => edit.set('summary', e.target.value)}
                          aria-label="Summary of results"
                        />
                      </div>
                    ) : (
                      <>
                        <div>{row.title}</div>
                        {row.performed_by && <div className="row-sub">{row.performed_by}</div>}
                        {row.summary && <div className="row-sub">{row.summary}</div>}
                        {row.url && (
                          <div style={{ width: 120, marginTop: 6 }}>
                            <FilePlate
                              url={row.url}
                              mime={row.mime}
                              title={row.title}
                              height="150px"
                              fit="contain"
                              placeholder="no file attached"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td style={{ opacity: 0.75 }}>
                    {editing && edit.draft ? (
                      <select
                        className="input"
                        value={edit.draft.kind}
                        onChange={(e) => edit.set('kind', e.target.value as EvaluationKind)}
                        aria-label="Type"
                      >
                        {EVALUATION_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    ) : (
                      row.kind
                    )}
                  </td>
                  <td className="nowrap" style={{ opacity: 0.7 }}>
                    {editing && edit.draft ? (
                      <input
                        className="input"
                        type="date"
                        value={edit.draft.evaluation_date}
                        onChange={(e) => edit.set('evaluation_date', e.target.value)}
                        aria-label="Date"
                      />
                    ) : (
                      fmtDate(row.evaluation_date)
                    )}
                  </td>
                  <td>
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
