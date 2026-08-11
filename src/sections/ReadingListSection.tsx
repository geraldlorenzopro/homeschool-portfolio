import { useState } from 'react'
import { EmptyState, Field, RemoveButton } from '@/components/ui'
import type { NewBook } from '@/data/repo'
import { useAction } from '@/data/store'
import { byDateDesc, fmtDate, today } from '@/lib/format'
import type { Book } from '@/lib/types'

const blank = (): NewBook => ({
  title: '',
  author: '',
  finished_on: today(),
  how_read: 'Read aloud together',
})

export function ReadingListSection({ rows }: { rows: Book[] }) {
  const [form, setForm] = useState<NewBook>(blank)
  const add = useAction<NewBook>((repo, input) => repo.addBook(input))
  const remove = useAction<string>((repo, id) => repo.deleteBook(id))

  const sorted = [...rows].sort(byDateDesc)

  function submit() {
    if (!form.title.trim()) return
    add.mutate(form, {
      // Date and "how it was read" carry over between titles.
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

      {sorted.length === 0 ? (
        <EmptyState>No titles yet. Add each book as you finish it.</EmptyState>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Title</th>
              <th style={{ width: 190 }}>Author</th>
              <th style={{ width: 190 }}>How it was read</th>
              <th style={{ width: 120 }}>Finished</th>
              <th style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((k) => (
              <tr key={k.id}>
                <td style={{ fontStyle: 'italic' }}>{k.title}</td>
                <td style={{ opacity: 0.75 }}>{k.author}</td>
                <td style={{ opacity: 0.6, fontSize: 13 }}>{k.how_read}</td>
                <td className="nowrap" style={{ opacity: 0.7 }}>
                  {fmtDate(k.finished_on)}
                </td>
                <td>
                  <RemoveButton onClick={() => remove.mutate(k.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
