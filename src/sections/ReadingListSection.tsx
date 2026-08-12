import { useState } from 'react'
import { DragHandle, RowActions } from '@/components/RowActions'
import { useDragOrder } from '@/components/useDragOrder'
import { useInlineEdit } from '@/components/useInlineEdit'
import { RowFiles, filesFor } from '@/components/RowFiles'
import { EmptyState, Field } from '@/components/ui'
import { useAction } from '@/data/store'
import { fmtDate, today } from '@/lib/format'
import type { Attachment, Book, Student } from '@/lib/types'

interface Draft {
  title: string
  author: string
  finished_on: string
  how_read: string
}

const blank = (): Draft => ({
  title: '',
  author: '',
  finished_on: today(),
  how_read: 'Read aloud together',
})

export function ReadingListSection({
  rows,
  student,
  attachments,
}: {
  rows: Book[]
  student: Student
  attachments: Attachment[]
}) {
  const [form, setForm] = useState<Draft>(blank)
  const edit = useInlineEdit<Book>()

  const add = useAction<Draft>((repo, input) => repo.add('books', input))
  const save = useAction<Book>((repo, row) =>
    repo.update('books', row.id, {
      title: row.title,
      author: row.author,
      finished_on: row.finished_on,
      how_read: row.how_read,
    }),
  )
  const remove = useAction<string>((repo, id) => repo.remove('books', id))
  const addFile = useAction<{ ownerId: string; title: string; file: File }>((repo, a) =>
    repo.add('attachments', { owner_type: 'book', owner_id: a.ownerId, title: a.title }, a.file),
  )
  const removeFile = useAction<string>((repo, id) => repo.remove('attachments', id))
  const reorder = useAction<string[]>((repo, ids) => repo.reorder('books', ids))

  const drag = useDragOrder(
    rows.map((r) => r.id),
    (ids) => reorder.mutate(ids),
  )

  function submit() {
    if (!form.title.trim()) return
    add.mutate(form, {
      onSuccess: () =>
        setForm({ ...blank(), finished_on: form.finished_on, how_read: form.how_read }),
    })
  }

  return (
    <div className="editor">
      <div
        className="add-card"
        style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr) 150px auto' }}
      >
        <Field label="Title">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Frog and Toad Together"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>
        <Field label="Author">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Arnold Lobel"
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          )}
        </Field>
        {student.show_dates && (
          <Field label="Finished">
            {(id) => (
              <input
                id={id}
                className="input"
                type="date"
                value={form.finished_on}
                onChange={(e) => setForm({ ...form, finished_on: e.target.value })}
              />
            )}
          </Field>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={submit}
          disabled={!form.title.trim()}
        >
          Add book
        </button>
        <Field label="How it was read" span>
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="Read aloud together / read independently"
              value={form.how_read}
              onChange={(e) => setForm({ ...form, how_read: e.target.value })}
            />
          )}
        </Field>
      </div>

      {rows.length === 0 ? (
        <EmptyState>No titles yet. Add each book as you finish it.</EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 28 }} />
              <th>Title</th>
              <th style={{ width: 170 }}>Author</th>
              <th style={{ width: 170 }}>How it was read</th>
              {student.show_dates && <th style={{ width: 115 }}>Finished</th>}
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
                  <td style={{ fontStyle: editing ? 'normal' : 'italic' }}>
                    {editing && edit.draft ? (
                      <input
                        className="input"
                        value={edit.draft.title}
                        onChange={(e) => edit.set('title', e.target.value)}
                        aria-label="Title"
                      />
                    ) : (
                      <>
                        {row.title}
                        <RowFiles
                          files={filesFor(attachments, 'book', row.id)}
                          onAdd={(f) =>
                            addFile.mutate({ ownerId: row.id, title: f.name, file: f })
                          }
                          onRemove={(id) => removeFile.mutate(id)}
                          pending={addFile.isPending}
                          label="page"
                        />
                      </>
                    )}
                  </td>
                  <td style={{ opacity: 0.75 }}>
                    {editing && edit.draft ? (
                      <input
                        className="input"
                        value={edit.draft.author}
                        onChange={(e) => edit.set('author', e.target.value)}
                        aria-label="Author"
                      />
                    ) : (
                      row.author
                    )}
                  </td>
                  <td style={{ opacity: 0.6, fontSize: 13 }}>
                    {editing && edit.draft ? (
                      <input
                        className="input"
                        value={edit.draft.how_read}
                        onChange={(e) => edit.set('how_read', e.target.value)}
                        aria-label="How it was read"
                      />
                    ) : (
                      row.how_read
                    )}
                  </td>
                  {student.show_dates && (
                    <td className="nowrap" style={{ opacity: 0.7 }}>
                      {editing && edit.draft ? (
                        <input
                          className="input"
                          type="date"
                          value={edit.draft.finished_on}
                          onChange={(e) => edit.set('finished_on', e.target.value)}
                          aria-label="Finished"
                        />
                      ) : (
                        fmtDate(row.finished_on)
                      )}
                    </td>
                  )}
                  <td>
                    <RowActions
                      editing={editing}
                      onEdit={() => edit.start(row)}
                      onSave={() => {
                        if (edit.draft) save.mutate(edit.draft, { onSuccess: edit.cancel })
                      }}
                      onCancel={edit.cancel}
                      onRemove={() => remove.mutate(row.id)}
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
