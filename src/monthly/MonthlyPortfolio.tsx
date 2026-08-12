import { useState } from 'react'
import type { Student } from '@/lib/types'
import {
  CHECKLIST_RECOMMENDED,
  CHECKLIST_REQUIRED,
  MONTHS,
  daysInMonth,
  useMonthlyYear,
  type MonthlyYear,
} from './store'

/** The pink used only on the cover, straight from the design tokens. */
const PINK = {
  bg: 'oklch(0.955 0.028 350)',
  rule: 'oklch(0.72 0.115 352)',
  text: 'oklch(0.5 0.115 352)',
}

type PageKey = 'cover' | 'record' | 'child' | string

export function MonthlyPortfolio({ student }: { student: Student }) {
  const {
    year,
    isLoading,
    error,
    updateYear,
    setSubject,
    setMonth,
    toggleDay,
    setCoverPhoto,
    savedAt,
    dirty,
  } = useMonthlyYear(student.id)
  const [page, setPage] = useState<PageKey>('cover')

  const pages: { key: PageKey; label: string }[] = [
    { key: 'cover', label: 'Cover' },
    { key: 'record', label: 'Portfolio record' },
    { key: 'child', label: 'Child’s information' },
    ...MONTHS.map((m) => ({ key: m.key, label: m.label })),
  ]

  const month = MONTHS.find((m) => m.key === page)

  if (error) {
    return <p className="empty-state" style={{ padding: 40 }}>{error.message}</p>
  }
  if (isLoading) {
    return <p className="empty-state" style={{ padding: 40 }}>Opening the year…</p>
  }

  return (
    <div className="panel-grid">
      <aside className="panel-aside no-print">
        <div>
          <div className="kicker">Monthly portfolio</div>
          <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.5, opacity: 0.75 }}>
            One page per month, exactly as it prints. Tick the day a subject was covered — it
            saves on its own.
          </p>
        </div>

        <div className="section-list">
          {pages.map((p) => {
            const marks = year.months[p.key]
              ? Object.values(year.months[p.key].marks).reduce((n, d) => n + d.length, 0)
              : 0
            return (
              <button
                key={p.key}
                type="button"
                className="section-link"
                aria-current={page === p.key}
                onClick={() => setPage(p.key)}
              >
                <span>{p.label}</span>
                {year.months[p.key] && (
                  <span className="section-count" data-filled={marks > 0}>
                    {marks}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="section-select field">
          <label htmlFor="monthly-page">Page</label>
          <select
            id="monthly-page"
            className="input"
            value={page}
            onChange={(e) => setPage(e.target.value)}
          >
            {pages.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <hr className="hr" style={{ margin: 0 }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span className="save-state" data-dirty={dirty}>
            {dirty
              ? 'Saving…'
              : savedAt
                ? `Saved ${savedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                : 'Saved'}
          </span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ justifyContent: 'flex-start', fontSize: 12 }}
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </aside>

      <main className="panel-main" style={{ maxWidth: 'none' }}>
        {page === 'cover' && <Cover year={year} student={student} update={updateYear} setCoverPhoto={setCoverPhoto} />}
        {page === 'record' && <RecordPage year={year} student={student} update={updateYear} />}
        {page === 'child' && <ChildInfo year={year} student={student} update={updateYear} />}
        {month && (
          <MonthLog
            key={month.key}
            year={year}
            student={student}
            month={month}
            setSubject={setSubject}
            setMonth={setMonth}
            toggleDay={toggleDay}
          />
        )}
      </main>
    </div>
  )
}

type Update = (patch: Partial<MonthlyYear>, immediate?: boolean) => void

/** Underlined field, the way every input in this document is drawn. */
function Rule({
  label,
  value,
  onChange,
  placeholder,
  size = 16,
  tabular,
  pink,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  size?: number
  tabular?: boolean
  pink?: boolean
}) {
  return (
    <label className="rule-field" style={{ display: 'block', flex: 1 }}>
      <span className="rule-label" style={pink ? { color: PINK.text } : undefined}>
        {label}
      </span>
      <input
        className="rule-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          fontSize: size,
          fontVariantNumeric: tabular ? 'tabular-nums' : undefined,
          borderBottomColor: pink ? PINK.rule : undefined,
        }}
      />
    </label>
  )
}

function Cover({
  year,
  student,
  update,
  setCoverPhoto,
}: {
  year: MonthlyYear
  student: Student
  update: Update
  setCoverPhoto: (file: File) => void
}) {
  return (
    <section className="sheet cover-sheet">
      <div className="cover-frame">
        <div className="cover-inner">
          <div className="cover-kicker">
            Florida Statute 1002.41 · {year.county || 'Broward'} County
          </div>
          <h1 className="cover-title">
            Home Education
            <br />
            Portfolio
          </h1>

          <div className="cover-ornament">
            <span className="rule" />
            <span className="diamond" />
            <span className="dot" />
            <span className="diamond" />
            <span className="rule" />
          </div>

          <div className="cover-year">School Year {year.label}</div>

          <div className="cover-photo-ring">
            <label className="cover-photo" title="Upload the student's photograph">
              {year.cover_photo ? (
                <img src={year.cover_photo} alt="" />
              ) : (
                <span>Click to upload the photograph</span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) setCoverPhoto(file)
                }}
              />
            </label>
          </div>

          <div className="cover-hint">Drag or click to upload the photograph</div>

          <div className="cover-fields">
            <Rule
              label="Student"
              value={student.name}
              onChange={() => {}}
              size={24}
              pink
            />
            <Rule
              label="Parent"
              value={year.parent_name}
              onChange={(v) => update({ parent_name: v })}
              size={16}
              pink
            />
          </div>

          <p className="cover-note">
            One portfolio may be used for more than one child in the same family. Add each
            child’s name above and note whose work each sample belongs to.
          </p>

          <div className="cover-belongs">
            <div className="cover-belongs-label">
              This book belongs to me — my drawings and words
            </div>
            <textarea
              aria-label="This book belongs to me — my drawings and words"
              value={year.belongs_to_me}
              onChange={(e) => update({ belongs_to_me: e.target.value })}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function RecordPage({
  year,
  student,
  update,
}: {
  year: MonthlyYear
  student: Student
  update: Update
}) {
  const tick = (key: string) => (
    <input
      type="checkbox"
      checked={Boolean(year.checklist[key])}
      onChange={(e) => update({ checklist: { ...year.checklist, [key]: e.target.checked } }, true)}
    />
  )

  /** The prototype bolds one phrase per item; **…** marks it. */
  const withEmphasis = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part))

  return (
    <section className="sheet doc-sheet">
      <div className="kicker">Portfolio record</div>
      <h2 className="sheet-title">Home Education Portfolio</h2>
      <hr className="hr" style={{ margin: '18px 0 22px' }} />

      <div style={{ display: 'flex', gap: 34 }}>
        <Rule
          label="From"
          value={year.from_date}
          onChange={(v) => update({ from_date: v })}
          size={15}
          tabular
        />
        <Rule
          label="To"
          value={year.to_date}
          onChange={(v) => update({ to_date: v })}
          size={15}
          tabular
        />
      </div>

      <div style={{ marginTop: 22 }}>
        <Rule label="For student(s)" value={student.name} onChange={() => {}} size={15} />
      </div>

      <h3 className="sheet-h3">A complete Florida portfolio must contain</h3>
      <hr className="hr" style={{ margin: '4px 0 14px' }} />
      <div className="check-list">
        {CHECKLIST_REQUIRED.map((item) => (
          <label key={item.key}>
            {tick(item.key)}
            <span>{withEmphasis(item.label)}</span>
          </label>
        ))}
      </div>

      <h3 className="sheet-h3">Recommended, not required</h3>
      <hr className="hr" style={{ margin: '4px 0 12px' }} />
      <p className="sheet-note">
        Florida Department of Education policy <em>recommends</em> — but Florida law does not
        require — that the portfolio also hold copies of:
      </p>
      <div className="check-list">
        {CHECKLIST_RECOMMENDED.map((item) => (
          <label key={item.key}>
            {tick(item.key)}
            <span>{item.label}</span>
          </label>
        ))}
      </div>

      <p className="sheet-footnote">
        The Letter of Intent is completed once, when the home education program begins; after
        several years of homeschooling it may be an old document. School districts may not add
        requirements beyond those set in state law.
      </p>
    </section>
  )
}

function ChildInfo({
  year,
  student,
  update,
}: {
  year: MonthlyYear
  student: Student
  update: Update
}) {
  return (
    <section className="sheet doc-sheet">
      <div className="kicker">Student record</div>
      <h2 className="sheet-title">Child’s Information</h2>
      <hr className="hr" style={{ margin: '18px 0 26px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Rule label="Child’s full name" value={student.name} onChange={() => {}} />

        <div style={{ display: 'flex', gap: 34 }}>
          <Rule
            label="Date of birth"
            value={student.dob}
            onChange={() => {}}
            placeholder="MM / DD / YYYY"
            tabular
          />
          <Rule
            label="Date of the Letter of Intent"
            value={year.letter_of_intent_date}
            onChange={(v) => update({ letter_of_intent_date: v })}
            placeholder="MM / DD / YYYY"
            tabular
          />
        </div>

        <p className="sheet-note" style={{ maxWidth: '5.6in', marginTop: -8 }}>
          The month and day of the Letter of Intent is the annual evaluation deadline every year —
          unless the child stops homeschooling first, in which case the deadline becomes 30 days
          after the Notice of Termination. When moving to another Florida county, use the Transfer
          Request instead.
        </p>

        <Rule
          label="Parent’s name"
          value={year.parent_name}
          onChange={(v) => update({ parent_name: v })}
        />
        <Rule
          label="Address"
          value={year.address}
          onChange={(v) => update({ address: v })}
          placeholder="Street address"
        />

        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <Rule
              label="City"
              value={year.city}
              onChange={(v) => update({ city: v })}
              placeholder="City"
            />
          </div>
          <span style={{ fontSize: 16, paddingBottom: 6 }}>, FL</span>
          <div style={{ flex: 1 }}>
            <Rule
              label="ZIP"
              value={year.zip}
              onChange={(v) => update({ zip: v })}
              placeholder="ZIP"
              tabular
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 34 }}>
        <div className="rule-label">
          Optional — notes anyone reading this record should know
        </div>
        <p className="sheet-note" style={{ margin: '6px 0 10px' }}>
          For example, special needs that may affect this child’s learning.
        </p>
        <textarea
          className="lined"
          aria-label="Notes anyone reading this record should know"
          style={{ minHeight: '2.6in' }}
          value={year.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
      </div>
    </section>
  )
}

function MonthLog({
  year,
  student,
  month,
  setSubject,
  setMonth,
  toggleDay,
}: {
  year: MonthlyYear
  student: Student
  month: (typeof MONTHS)[number]
  setSubject: (index: number, label: string) => void
  setMonth: (key: string, patch: Partial<MonthlyYear['months'][string]>) => void
  toggleDay: (key: string, subject: number, day: number) => void
}) {
  const record = year.months[month.key]
  const real = daysInMonth(month.year, month.month)
  const days = Array.from({ length: 31 }, (_, i) => i + 1)

  return (
    <section className="sheet doc-sheet log-sheet">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 20 }}>
        <div className="kicker">Log of Educational Activities</div>
        <div className="num" style={{ fontSize: 11, opacity: 0.62 }}>
          School year {year.label}
        </div>
      </div>
      <h2 className="sheet-title" style={{ fontSize: 36, margin: '6px 0 0' }}>
        {month.label}
      </h2>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-end', marginTop: 12 }}>
        <Rule label="Student" value={student.name} onChange={() => {}} size={13} />
        <div style={{ width: '2.1in' }}>
          <Rule
            label="Hours or notes"
            value={record.hours_notes}
            onChange={(v) => setMonth(month.key, { hours_notes: v })}
            size={13}
          />
        </div>
      </div>

      <p className="sheet-note" style={{ margin: '14px 0 8px', fontSize: 10.5 }}>
        Check the box under the day of the month on which the subject was covered. Days this month
        does not have are struck through.
      </p>

      <div className="log-grid">
        <div className="log-row log-head">
          <div className="log-subject">Subject / Date</div>
          {days.map((d) => (
            <div key={d} className="log-day num" data-missing={d > real || undefined}>
              {d}
            </div>
          ))}
        </div>

        {year.subjects.map((label, index) => (
          <div className="log-row" key={index}>
            <div className="log-subject">
              {index < 3 ? (
                label
              ) : (
                <input
                  className="log-subject-input"
                  value={label}
                  placeholder="Other subject"
                  aria-label={`Name of subject row ${index + 1}`}
                  onChange={(e) => setSubject(index, e.target.value)}
                />
              )}
            </div>
            {days.map((d) => {
              const missing = d > real
              const checked = (record.marks[index] ?? []).includes(d)
              return (
                <div key={d} className="log-cell" data-missing={missing || undefined}>
                  {!missing && (
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`${label || `Subject ${index + 1}`} on ${month.label} ${d}`}
                      onChange={() => toggleDay(month.key, index, d)}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="rule-label">Titles of Reading Materials</div>
        <textarea
          className="lined"
          aria-label="Titles of Reading Materials"
          style={{ minHeight: '1.5in', marginTop: 6 }}
          value={record.reading_materials}
          onChange={(e) => setMonth(month.key, { reading_materials: e.target.value })}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22, marginTop: 18 }}>
        <div>
          <div className="rule-label">Field trips, special events &amp; educational activities</div>
          <textarea
            className="lined"
            aria-label="Field trips, special events and educational activities"
            style={{ minHeight: '1.5in', marginTop: 6 }}
            value={record.field_trips}
            onChange={(e) => setMonth(month.key, { field_trips: e.target.value })}
          />
        </div>
        <div>
          <div className="rule-label">Accomplishments this month</div>
          <textarea
            className="lined"
            aria-label="Accomplishments this month"
            style={{ minHeight: '1.5in', marginTop: 6 }}
            value={record.accomplishments}
            onChange={(e) => setMonth(month.key, { accomplishments: e.target.value })}
          />
        </div>
      </div>

      <p className="sheet-footnote">
        Home Education Portfolio · {year.county || 'Broward'} County, Florida — {month.label}
      </p>
    </section>
  )
}
