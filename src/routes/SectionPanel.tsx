import { useState } from 'react'
import { useAction } from '@/data/store'
import { subjectLabel } from '@/lib/format'
import type { Portfolio } from '@/lib/types'
import { CurriculumSection } from '@/sections/CurriculumSection'
import { ReadingListSection } from '@/sections/ReadingListSection'
import { StudentInfo } from '@/sections/StudentInfo'
import { SubjectLogSection } from '@/sections/SubjectLogSection'
import { SupportDocsSection } from '@/sections/SupportDocsSection'
import { WorkSamplesSection } from '@/sections/WorkSamplesSection'

interface SectionDef {
  key: string
  label: string
  /** 'ok' for the student record, which is complete rather than counted. */
  count: number | 'ok'
}

const COPY: Record<string, [title: string, hint: string]> = {
  info: [
    'Student information',
    'The identifying record at the front of the portfolio: who the student is, who taught, and who evaluates.',
  ],
  curriculum: [
    'Curriculum used',
    'The programs, textbooks and packaged courses you taught from this year. Listing them shows the evaluator the scope and sequence behind the daily log.',
  ],
  docs: [
    'Support documents',
    'Upload the student’s IEP, therapy or service plans, medical letters and prior evaluations. They are attached to the portfolio as supporting evidence for accommodations.',
  ],
  books: [
    'Reading list',
    'Florida asks for a list of reading materials used. Add each title as you finish it.',
  ],
  samples: [
    'Work samples',
    'Photographs or scans of worksheets, writing, drawings and projects. Two or three per subject is plenty.',
  ],
}

const SUBJECT_HINT =
  'Every activity you log here becomes a dated row in the portfolio’s log of educational activities.'

export function SectionPanel({ portfolio }: { portfolio: Portfolio }) {
  const [section, setSection] = useState('info')
  const reset = useAction<void>((repo) => repo.resetToSample())

  const { student, subjects, activities, curriculums, books, workSamples, supportDocuments } =
    portfolio

  const studentFilled = Object.entries(student).some(
    ([k, v]) => k !== 'id' && String(v ?? '').trim() !== '',
  )

  const sections: SectionDef[] = [
    { key: 'info', label: 'Student information', count: studentFilled ? 'ok' : 0 },
    { key: 'curriculum', label: 'Curriculum used', count: curriculums.length },
    { key: 'docs', label: 'Support documents (IEP)', count: supportDocuments.length },
    ...subjects.map((s) => ({
      key: s.key,
      label: s.label,
      count: activities.filter((a) => a.subject_key === s.key).length,
    })),
    { key: 'books', label: 'Reading list', count: books.length },
    { key: 'samples', label: 'Work samples', count: workSamples.length },
  ]

  const filled = sections.filter((s) => s.count === 'ok' || s.count > 0).length
  const pct = Math.round((filled / sections.length) * 100)

  const isSubject = subjects.some((s) => s.key === section)
  const [title, hint] = isSubject
    ? [subjectLabel(section, subjects), SUBJECT_HINT]
    : (COPY[section] ?? ['', ''])

  return (
    <div className="panel-grid">
      <aside className="panel-aside no-print">
        <div>
          <div className="kicker">Flow A</div>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, opacity: 0.75 }}>
            Open any section, any time. Nothing is required in order — the portfolio assembles
            itself from whatever is filled in.
          </p>
        </div>

        {/* Layout lives in the stylesheet, not inline — an inline display
            would outrank the media query that collapses this into a select. */}
        <div className="section-list">
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              className="section-link"
              aria-current={section === s.key}
              onClick={() => setSection(s.key)}
            >
              <span>{s.label}</span>
              <span className="section-count" data-filled={s.count === 'ok' || s.count > 0}>
                {s.count === 'ok' ? '✓' : s.count}
              </span>
            </button>
          ))}
        </div>

        {/* Below 900 px the list becomes a single control. */}
        <div className="section-select field">
          <label htmlFor="section-select">Section</label>
          <select
            id="section-select"
            className="input"
            value={section}
            onChange={(e) => setSection(e.target.value)}
          >
            {sections.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label} {s.count === 'ok' ? '✓' : `(${s.count})`}
              </option>
            ))}
          </select>
        </div>

        <hr className="hr" style={{ margin: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.7 }}>
            <span>Year completeness</span>
            <span className="num">{pct}%</span>
          </div>
          <div
            className="meter-track"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Year completeness"
          >
            <div className="meter-fill" style={{ width: `${pct}%` }} />
          </div>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ justifyContent: 'flex-start', fontSize: 12 }}
            onClick={() => {
              if (window.confirm('Replace everything in this year with the sample data?')) {
                reset.mutate()
              }
            }}
          >
            Reset to sample data
          </button>
        </div>
      </aside>

      <main className="panel-main">
        <h1 className="panel-title">{title}</h1>
        <p className="panel-hint">{hint}</p>

        {section === 'info' && <StudentInfo student={student} />}
        {section === 'curriculum' && <CurriculumSection rows={curriculums} />}
        {section === 'docs' && <SupportDocsSection rows={supportDocuments} />}
        {isSubject && (
          <SubjectLogSection
            key={section}
            subjectKey={section}
            subjectLabel={subjectLabel(section, subjects)}
            rows={activities.filter((a) => a.subject_key === section)}
          />
        )}
        {section === 'books' && <ReadingListSection rows={books} />}
        {section === 'samples' && <WorkSamplesSection rows={workSamples} />}
      </main>
    </div>
  )
}
