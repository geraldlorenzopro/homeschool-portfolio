import { useEffect, useRef, useState } from 'react'
import { Field, FilePreview, Plate, RemoveButton, ViewButton } from '@/components/ui'
import { useAction } from '@/data/store'
import { fileSizeLabel, fmtDate } from '@/lib/format'
import { isImage, isPdf } from '@/lib/image'
import type { Attachment, Student, StudentField } from '@/lib/types'

type Patch = Partial<Omit<Student, 'id'>>

/**
 * Who the child is, and what a reader needs to know before the goals make
 * sense. Text saves on a 500 ms debounce, the way the student record does.
 */
export function ProfileSection({
  student,
  attachments,
}: {
  student: Student
  attachments: Attachment[]
}) {
  const save = useAction<Patch>((repo, patch) => repo.updateStudent(patch))
  const [draft, setDraft] = useState(student)
  const pending = useRef<Patch>({})
  const timer = useRef<number | undefined>(undefined)
  const fileInput = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')

  const addDoc = useAction<{ title: string; file: File }>((repo, a) =>
    repo.add('attachments', { owner_type: 'profile', owner_id: null, title: a.title }, a.file),
  )
  const removeDoc = useAction<string>((repo, id) => repo.remove('attachments', id))

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

  function set(key: StudentField, value: string | boolean, immediate = false) {
    setDraft((d) => ({ ...d, [key]: value }))
    pending.current[key] = value as never
    window.clearTimeout(timer.current)
    if (immediate) flush()
    else timer.current = window.setTimeout(flush, 500)
  }

  const docs = attachments.filter((a) => a.owner_type === 'profile')

  function attach() {
    if (!file) return
    addDoc.mutate(
      { title: title.trim() || file.name, file },
      {
        onSuccess: () => {
          setTitle('')
          setFile(null)
          if (fileInput.current) fileInput.current.value = ''
        },
      },
    )
  }

  return (
    <div className="editor">
      <div style={{ display: 'grid', gap: 18, maxWidth: 680 }}>
        <label className="switch">
          <input
            type="checkbox"
            checked={draft.no_formal_diagnosis}
            onChange={(e) => set('no_formal_diagnosis', e.target.checked, true)}
          />
          <span>No formal diagnosis</span>
        </label>

        {!draft.no_formal_diagnosis && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 18,
            }}
          >
            <Field label="Diagnosis" span>
              {(id) => (
                <input
                  id={id}
                  className="input"
                  placeholder="Specific learning disability in reading (dyslexia)"
                  value={draft.diagnosis}
                  onChange={(e) => set('diagnosis', e.target.value)}
                  onBlur={flush}
                />
              )}
            </Field>
            <Field label="Date of diagnosis">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  type="date"
                  value={draft.diagnosis_date}
                  onChange={(e) => set('diagnosis_date', e.target.value, true)}
                />
              )}
            </Field>
            <Field label="Diagnosed by">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  placeholder="District evaluation team"
                  value={draft.diagnosed_by}
                  onChange={(e) => set('diagnosed_by', e.target.value)}
                  onBlur={flush}
                />
              )}
            </Field>
          </div>
        )}

        <Field label="Strengths">
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 70 }}
              placeholder="What the child does well, and what they enjoy."
              value={draft.strengths}
              onChange={(e) => set('strengths', e.target.value)}
              onBlur={flush}
            />
          )}
        </Field>

        <Field label="Needs">
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 70 }}
              placeholder="Where support is needed, and any accommodations followed at home."
              value={draft.needs}
              onChange={(e) => set('needs', e.target.value)}
              onBlur={flush}
            />
          )}
        </Field>

        <Field label="How the child learns best">
          {(id) => (
            <textarea
              id={id}
              className="input"
              style={{ minHeight: 70 }}
              placeholder="Multisensory work; one instruction at a time, modelled first."
              value={draft.learns_best}
              onChange={(e) => set('learns_best', e.target.value)}
              onBlur={flush}
            />
          )}
        </Field>

        <hr className="hr" style={{ margin: 0 }} />

        <label className="switch">
          <input
            type="checkbox"
            checked={draft.include_profile}
            onChange={(e) => set('include_profile', e.target.checked, true)}
          />
          <span>
            Include this profile in the printed portfolio
            <span style={{ display: 'block', fontSize: 12, opacity: 0.65, marginTop: 2 }}>
              The printed PDF leaves your control and this section carries a minor's medical
              information. Off by default.
            </span>
          </span>
        </label>
      </div>

      <div className="add-card" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
        <div className="kicker span-all">Attach the diagnosis or evaluation document</div>
        <Field label="Document title">
          {(id) => (
            <input
              id={id}
              className="input"
              placeholder="District psychoeducational evaluation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          )}
        </Field>
        <Field label="File (PDF or image)">
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
          onClick={attach}
          disabled={!file || addDoc.isPending}
        >
          {addDoc.isPending ? 'Attaching…' : 'Attach document'}
        </button>
      </div>

      {docs.length > 0 && (
        <div
          className="figure-grid"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
        >
          {docs.map((doc) => (
            <figure key={doc.id} className="figure">
              <Plate
                url={isImage(doc.mime) ? doc.url : null}
                height="150px"
                alt={doc.title}
                zoomable={isImage(doc.mime)}
                placeholder={isPdf(doc.mime) ? 'PDF document attached' : 'document attached'}
              />
              <figcaption style={{ fontSize: 13, lineHeight: 1.45 }}>
                <div>{doc.title}</div>
                <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                  {[doc.file_name, fileSizeLabel(doc.size_bytes)].filter(Boolean).join('  ·  ')}
                </div>
              </figcaption>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <ViewButton url={doc.url} mime={doc.mime} title={doc.title} />
                <RemoveButton
                  onClick={() => {
                    if (window.confirm(`Remove “${doc.title}” and delete the uploaded file?`)) {
                      removeDoc.mutate(doc.id)
                    }
                  }}
                />
              </div>
            </figure>
          ))}
        </div>
      )}

      {draft.diagnosis_date && !draft.no_formal_diagnosis && (
        <p className="empty-state">Diagnosed {fmtDate(draft.diagnosis_date)}.</p>
      )}
    </div>
  )
}
