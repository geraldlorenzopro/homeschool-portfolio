import { useState } from 'react'
import { useAction } from '@/data/store'
import type { Portfolio } from '@/lib/types'
import { AreasSection } from '@/sections/AreasSection'
import { CurriculumSection } from '@/sections/CurriculumSection'
import { EntriesSection } from '@/sections/EntriesSection'
import { EvaluationsSection } from '@/sections/EvaluationsSection'
import { GoalsSection } from '@/sections/GoalsSection'
import { ProfileSection } from '@/sections/ProfileSection'
import { ReadingListSection } from '@/sections/ReadingListSection'
import { StudentInfo } from '@/sections/StudentInfo'
import { SupportDocsSection } from '@/sections/SupportDocsSection'
import { WorkSamplesSection } from '@/sections/WorkSamplesSection'

interface SectionDef {
  key: string
  label: string
  /** 'ok' for records that are complete rather than counted. */
  count: number | 'ok'
  title: string
  hint: string
}

export function SectionPanel({ portfolio }: { portfolio: Portfolio }) {
  const [section, setSection] = useState('info')
  const reset = useAction<void>((repo) => repo.resetToSample())

  const {
    student,
    areas,
    goals,
    entries,
    curriculums,
    books,
    workSamples,
    supportDocuments,
    evaluations,
    attachments,
  } = portfolio

  const studentFilled = ['name', 'grade', 'school_year', 'parent_name'].some(
    (k) => String(student[k as keyof typeof student] ?? '').trim() !== '',
  )
  const profileFilled =
    student.no_formal_diagnosis ||
    [student.diagnosis, student.strengths, student.needs, student.learns_best].some(
      (v) => v.trim() !== '',
    )

  const areaSections: SectionDef[] = areas.map((area) => ({
    key: `area:${area.id}`,
    label: area.label,
    count: entries.filter((e) => e.area_id === area.id).length,
    title: area.label,
    hint: 'Every session you log here becomes a dated row in the portfolio, under the goal it worked.',
  }))

  const sections: SectionDef[] = [
    {
      key: 'info',
      label: 'Student information',
      count: studentFilled ? 'ok' : 0,
      title: 'Student information',
      hint: 'The identifying record at the front of the portfolio, and the switches that decide what the rest of it records.',
    },
    {
      key: 'profile',
      label: 'Child profile',
      count: profileFilled ? 'ok' : 0,
      title: 'Child profile',
      hint: 'Who the child is, any diagnosis, and how they learn best. This is the context that makes the goals below make sense.',
    },
    {
      key: 'areas',
      label: 'Areas',
      count: areas.length,
      title: 'Areas',
      hint: 'The areas of development this portfolio covers. Start from the ten below, remove what does not apply, and add your own.',
    },
    {
      key: 'goals',
      label: 'Goals',
      count: goals.length,
      title: 'Goals',
      hint: 'What the year is working toward, grouped by area. Copy them from the official IEP or write your own — each one is marked so the evaluator can tell which is which.',
    },
    {
      key: 'evaluations',
      label: 'Evaluations',
      count: evaluations.length,
      title: 'Evaluations',
      hint: 'Psychoeducational, speech, therapy or medical evaluations done recently. Record the findings and attach the report.',
    },
    ...areaSections,
    {
      key: 'curriculum',
      label: 'Curriculum used',
      count: curriculums.length,
      title: 'Curriculum used',
      hint: 'The programs, textbooks and packaged courses you taught from this year.',
    },
    {
      key: 'books',
      label: 'Reading list',
      count: books.length,
      title: 'Reading list',
      hint: 'Florida asks for a list of reading materials used. Add each title as you finish it.',
    },
    {
      key: 'samples',
      label: 'Work samples',
      count: workSamples.length,
      title: 'Work samples',
      hint: 'Photographs or scans of the work itself. Attach each one to the goal it evidences and the evaluator can see the proof beside the claim.',
    },
    {
      key: 'docs',
      label: 'Support documents (IEP)',
      count: supportDocuments.length,
      title: 'Support documents',
      hint: 'Upload the IEP, therapy or service plans, medical letters and prior evaluations. They are attached to the portfolio as supporting evidence.',
    },
  ]

  // Areas count as one item between them, not ten. Most portfolios use two or
  // three of the IEP domains, and the empty ones are not gaps to be filled —
  // counting each one would make a complete year read as 60%.
  const fixed = sections.filter((s) => !s.key.startsWith('area:'))
  const filledFixed = fixed.filter((s) => s.count === 'ok' || s.count > 0).length
  const anyAreaLogged = areaSections.some((s) => s.count !== 'ok' && s.count > 0)
  const pct = Math.round(((filledFixed + (anyAreaLogged ? 1 : 0)) / (fixed.length + 1)) * 100)
  const current = sections.find((s) => s.key === section) ?? sections[0]

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
          <div
            style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, opacity: 0.7 }}
          >
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
        <h1 className="panel-title">{current.title}</h1>
        <p className="panel-hint">{current.hint}</p>

        {section === 'info' && <StudentInfo student={student} />}
        {section === 'profile' && <ProfileSection student={student} attachments={attachments} />}
        {section === 'areas' && <AreasSection areas={areas} goals={goals} entries={entries} />}
        {section === 'goals' && <GoalsSection areas={areas} goals={goals} entries={entries} />}
        {section.startsWith('area:') &&
          (() => {
            const area = areas.find((a) => `area:${a.id}` === section)
            return area ? (
              <EntriesSection
                key={area.id}
                student={student}
                area={area}
                goals={goals}
                entries={entries}
              />
            ) : null
          })()}
        {section === 'evaluations' && <EvaluationsSection rows={evaluations} />}
        {section === 'curriculum' && <CurriculumSection rows={curriculums} areas={areas} />}
        {section === 'books' && <ReadingListSection rows={books} student={student} />}
        {section === 'samples' && (
          <WorkSamplesSection
            rows={workSamples}
            areas={areas}
            goals={goals}
            student={student}
          />
        )}
        {section === 'docs' && <SupportDocsSection rows={supportDocuments} />}
      </main>
    </div>
  )
}
