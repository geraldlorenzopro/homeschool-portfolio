import { Fragment, useEffect, useState } from 'react'
import { waitForPrintReady } from '@/lib/printReady'
import { PdfPages } from '@/components/PdfPages'
import { CoverBorder } from './CoverBorder'
import { FilePlate, RemoveButton, ViewButton } from '@/components/ui'
import { isPdf } from '@/lib/image'
import { fmtDate } from '@/lib/format'
import type { Student } from '@/lib/types'
import {
  CHECKLIST_RECOMMENDED,
  CHECKLIST_REQUIRED,
  DOCUMENT_KINDS,
  MONTHS,
  WEEKDAYS,
  daysInMonth,
  isWeekend,
  weekdayOf,
  useMonthlyYear,
  type MonthlyCurriculum,
  type MonthlyDocument,
  type MonthlySample,
  type MonthlyYear,
} from './store'

/** The pink used only on the cover, straight from the design tokens. */
const PINK = {
  bg: 'oklch(0.955 0.028 350)',
  rule: 'oklch(0.72 0.115 352)',
  text: 'oklch(0.5 0.115 352)',
}

type PageKey = 'cover' | 'record' | 'child' | string

/** The folder in the order it prints — and what "sheet 4 of 17" counts. */
const SHEETS: PageKey[] = [
  'cover',
  'record',
  'child',
  ...MONTHS.map((m) => m.key),
  'curriculum',
  'samples',
  'documents',
]

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
    addCurriculum,
    setCurriculum,
    removeCurriculum,
    addSamples,
    setSample,
    removeSample,
    addDocuments,
    setDocument,
    removeDocument,
    savedAt,
    dirty,
  } = useMonthlyYear(student.id)
  const [page, setPage] = useState<PageKey>('cover')
  /** null when nobody is printing; otherwise what is about to be printed. */
  const [printing, setPrinting] = useState<null | 'sheet' | 'folder'>(null)

  // Nothing may reach the print dialog until every canvas and every
  // photograph has finished drawing. They arrive after the elements that hold
  // them, and printing early yields blank pages — the one failure mode of
  // this feature that the parent would only discover on paper.
  useEffect(() => {
    if (!printing) return
    let cancelled = false
    void (async () => {
      await waitForPrintReady()
      if (cancelled) return

      // The folder has to stay mounted until the browser is finished with it.
      // window.print() blocks in Chrome but returns immediately in Safari, and
      // tearing the pages down mid-dialog would print whatever is left.
      const done = () => {
        window.removeEventListener('afterprint', done)
        setPrinting(null)
      }
      window.addEventListener('afterprint', done)
      window.print()
    })()
    return () => {
      cancelled = true
    }
  }, [printing])

  const pages: { key: PageKey; label: string }[] = [
    { key: 'cover', label: 'Cover' },
    { key: 'record', label: 'Portfolio record' },
    { key: 'child', label: 'Child’s information' },
    ...MONTHS.map((m) => ({ key: m.key, label: m.label })),
    { key: 'curriculum', label: 'Curriculums used' },
    { key: 'samples', label: 'Work samples' },
    { key: 'documents', label: 'Additional documents' },
  ]

  if (error) {
    return <p className="empty-state" style={{ padding: 40 }}>{error.message}</p>
  }
  if (isLoading) {
    return <p className="empty-state" style={{ padding: 40 }}>Opening the year…</p>
  }

  const sheet = (key: PageKey) => {
    const m = MONTHS.find((x) => x.key === key)
    if (m) {
      return (
        <MonthLog
          year={year}
          student={student}
          month={m}
          setSubject={setSubject}
          setMonth={setMonth}
          toggleDay={toggleDay}
        />
      )
    }
    switch (key) {
      case 'cover':
        return (
          <Cover year={year} student={student} update={updateYear} setCoverPhoto={setCoverPhoto} />
        )
      case 'record':
        return <RecordPage year={year} student={student} update={updateYear} />
      case 'child':
        return <ChildInfo year={year} student={student} update={updateYear} />
      case 'curriculum':
        return (
          <CurriculumPage
            year={year}
            student={student}
            add={addCurriculum}
            set={setCurriculum}
            remove={removeCurriculum}
          />
        )
      case 'samples':
        return (
          <SamplesPage
            year={year}
            student={student}
            add={addSamples}
            set={setSample}
            remove={removeSample}
            busy={dirty}
            printing={printing !== null}
          />
        )
      case 'documents':
        return (
          <DocumentsPage
            year={year}
            student={student}
            add={addDocuments}
            set={setDocument}
            remove={removeDocument}
            busy={dirty}
          />
        )
      default:
        return null
    }
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
              : p.key === 'curriculum'
                ? year.curriculums.length
                : p.key === 'samples'
                  ? year.samples.length
                  : p.key === 'documents'
                    ? year.documents.length
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
                {(year.months[p.key] ||
                  p.key === 'curriculum' ||
                  p.key === 'samples' ||
                  p.key === 'documents') && (
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
            className="btn"
            style={{ justifyContent: 'flex-start', fontSize: 12 }}
            disabled={printing !== null}
            onClick={() => setPrinting('sheet')}
          >
            Print this sheet
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ justifyContent: 'flex-start', fontSize: 12 }}
            disabled={printing !== null}
            onClick={() => setPrinting('folder')}
          >
            Print the whole folder — {SHEETS.length} sheets
          </button>
          {printing && (
            <span className="save-state" data-dirty="true" role="status">
              {printing === 'folder'
                ? 'Drawing every page of the folder…'
                : 'Drawing this sheet…'}
            </span>
          )}
        </div>
      </aside>

      <main className="panel-main" style={{ maxWidth: 'none' }}>
        {(printing === 'folder' ? SHEETS : [page]).map((key) => (
          <Fragment key={key}>{sheet(key)}</Fragment>
        ))}
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
      <span
        className="print-only rule-printed"
        style={{ fontSize: size, borderBottomColor: pink ? PINK.rule : undefined }}
      >
        {value}
      </span>
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
      <CoverBorder />
      <div className="cover-frame">
        <div className="cover-inner">
          <div className="cover-kicker">
            Florida Statute 1002.41{year.county ? ` · ${year.county} County` : ''}
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

          <p className="no-print cover-note">
            One portfolio may be used for more than one child in the same family. Add each
            child’s name above and note whose work each sample belongs to.
          </p>

        </div>
      </div>
      <SheetFoot
        student={student}
        year={year}
        sheet="Cover"
        index={SHEETS.indexOf('cover') + 1}
        total={SHEETS.length}
      />
    </section>
  )
}

/**
 * The footer every sheet carries.
 *
 * A folder gets photocopied, stapled, carried between desks and put down. Six
 * of the twenty pages named no child at all, and nothing said which folder a
 * loose page belonged to or when it was printed — so two versions of the same
 * portfolio were indistinguishable on paper.
 *
 * The date is the day it was printed, formatted the long way: 08/09/2026 is
 * two different days depending on who reads it.
 */
function SheetFoot({
  student,
  year,
  sheet,
  index,
  total,
}: {
  student: Student
  year: MonthlyYear
  sheet: string
  index: number
  total: number
}) {
  const printed = new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  return (
    <p className="sheet-footnote sheet-foot">
      <span>
        {student.name} · Home Education Portfolio{year.label ? ` ${year.label}` : ''}
        {year.county ? ` · ${year.county} County, Florida` : ' · Florida'}
      </span>
      <span>
        {sheet} · sheet {index} of {total} · printed {printed}
      </span>
    </p>
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
          label="School year"
          value={year.label}
          onChange={(v) => update({ label: v })}
          placeholder="2025–2026"
          size={15}
        />
        <Rule
          label="County"
          value={year.county}
          onChange={(v) => update({ county: v })}
          placeholder="The district this portfolio answers to"
          size={15}
        />
      </div>

      <div style={{ display: 'flex', gap: 34, marginTop: 22 }}>
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
      <SheetFoot
        student={student}
        year={year}
        sheet="Portfolio record"
        index={SHEETS.indexOf('record') + 1}
        total={SHEETS.length}
      />
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
      <p className="sheet-note no-print" style={{ margin: '10px 0 0', maxWidth: '5.6in' }}>
        The home address, the date of birth and your notes are greyed on paper — they stay in this
        app. s. 1002.41 does not ask for them, and the district already has them from the Letter of
        Intent. What prints is the child’s name, yours, and the date of that letter.
      </p>
      <hr className="hr" style={{ margin: '18px 0 26px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Rule label="Child’s full name" value={student.name} onChange={() => {}} />

        <div style={{ display: 'flex', gap: 34 }}>
          <div className="no-print" style={{ flex: 1 }}>
            <Rule
              label="Date of birth"
              value={student.dob}
              onChange={() => {}}
              placeholder="MM / DD / YYYY"
              tabular
            />
          </div>
          <div style={{ flex: 1 }}>
            <Rule
              label="Date of the Letter of Intent"
              value={year.letter_of_intent_date}
              onChange={(v) => update({ letter_of_intent_date: v })}
              placeholder="MM / DD / YYYY"
              tabular
            />
          </div>
        </div>

        <p className="no-print sheet-note" style={{ maxWidth: '5.6in', marginTop: -8 }}>
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
        <div className="no-print">
          <Rule
            label="Address"
            value={year.address}
            onChange={(v) => update({ address: v })}
            placeholder="Street address"
          />
        </div>

        <div className="no-print" style={{ display: 'flex', gap: 20, alignItems: 'flex-end' }}>
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

      <div className="no-print" style={{ marginTop: 34 }}>
        <div className="rule-label">Optional — your own notes about this child</div>
        <p className="sheet-note" style={{ margin: '6px 0 10px' }}>
          These stay with you. Anything about a diagnosis, a therapy or how this child learns is
          yours to share with an evaluator when you judge it helps her — the statute does not ask
          for it, and it does not print with the portfolio.
        </p>
        <textarea
          className="lined"
          aria-label="Notes anyone reading this record should know"
          style={{ minHeight: '2.6in' }}
          value={year.notes}
          onChange={(e) => update({ notes: e.target.value })}
        />
        <div className="print-only lined-printed">{year.notes}</div>
      </div>
      <SheetFoot
        student={student}
        year={year}
        sheet="Child’s information"
        index={SHEETS.indexOf('child') + 1}
        total={SHEETS.length}
      />
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

      <p className="no-print sheet-note" style={{ margin: '14px 0 8px', fontSize: 10.5 }}>
        Check the box under the day of the month on which the subject was covered. Days this month
        does not have are struck through.
      </p>

      <div className="log-grid">
        <div className="log-row log-head">
          <div className="log-subject">Subject / Date</div>
          {days.map((d) => {
            const missing = d > real
            const weekday = missing ? null : weekdayOf(month.year, month.month, d)
            return (
              <div
                key={d}
                className="log-day"
                data-missing={missing || undefined}
                data-weekend={(weekday !== null && isWeekend(weekday)) || undefined}
              >
                <span className="log-weekday">{weekday === null ? '' : WEEKDAYS[weekday]}</span>
                <span className="num">{d}</span>
              </div>
            )
          })}
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
              const weekend = !missing && isWeekend(weekdayOf(month.year, month.month, d))
              return (
                <div
                  key={d}
                  className="log-cell"
                  data-missing={missing || undefined}
                  data-weekend={weekend || undefined}
                >
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
        <div className="print-only lined-printed">{record.reading_materials}</div>
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
          <div className="print-only lined-printed">{record.field_trips}</div>
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
          <div className="print-only lined-printed">{record.accomplishments}</div>
        </div>
      </div>

      <SheetFoot
        student={student}
        year={year}
        sheet={month.label}
        index={SHEETS.indexOf(month.key) + 1}
        total={SHEETS.length}
      />
    </section>
  )
}

/**
 * The materials the year was taught with — the statute's "titles of materials
 * used". Free text on purpose: a Kindergarten year is a reading programme, a
 * maths app and a library card, and none of them belongs to one subject row.
 */
function CurriculumPage({
  year,
  student,
  add,
  set,
  remove,
}: {
  year: MonthlyYear
  student: Student
  add: () => void
  set: (id: string, patch: Partial<MonthlyCurriculum>) => void
  remove: (id: string) => void
}) {
  return (
    <section className="sheet doc-sheet">
      <div className="kicker">Curriculum &amp; Materials Used</div>
      <h2 className="sheet-title" style={{ fontSize: 34, margin: '6px 0 0' }}>
        Curriculums used
      </h2>
      <p className="no-print sheet-note" style={{ margin: '10px 0 16px', fontSize: 11 }}>
        Every programme, book, site or app used this school year. Florida asks for the titles of
        the materials — this page is that list.
      </p>

      {year.curriculums.length === 0 ? (
        <p className="empty-state">Nothing listed yet.</p>
      ) : (
        <table className="table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th style={{ width: '32%' }}>Title</th>
              <th style={{ width: '20%' }}>Publisher</th>
              <th style={{ width: '18%' }}>Subject</th>
              <th>How it was used</th>
              <th className="no-print" style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {year.curriculums.map((row) => (
              <tr key={row.id}>
                <td>
                  <input
                    className="cell-input"
                    value={row.title}
                    placeholder="Time4Learning"
                    aria-label="Curriculum title"
                    onChange={(e) => set(row.id, { title: e.target.value })}
                  />
                  <span className="print-only cell-printed">{row.title}</span>
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.publisher}
                    placeholder="Publisher"
                    aria-label="Publisher"
                    onChange={(e) => set(row.id, { publisher: e.target.value })}
                  />
                  <span className="print-only cell-printed">{row.publisher}</span>
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.subject}
                    placeholder="Language Arts"
                    aria-label="Subject"
                    onChange={(e) => set(row.id, { subject: e.target.value })}
                  />
                  <span className="print-only cell-printed">{row.subject}</span>
                </td>
                <td>
                  <input
                    className="cell-input"
                    value={row.usage}
                    placeholder="Daily lessons and quizzes"
                    aria-label="How it was used"
                    onChange={(e) => set(row.id, { usage: e.target.value })}
                  />
                  <span className="print-only cell-printed">{row.usage}</span>
                </td>
                <td className="no-print">
                  <RemoveButton
                    onClick={() => remove(row.id)}
                    label={`Remove ${row.title || 'this curriculum'}`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button type="button" className="btn no-print" style={{ marginTop: 14 }} onClick={add}>
        + Add curriculum
      </button>
      <SheetFoot
        student={student}
        year={year}
        sheet="Curriculums used"
        index={SHEETS.indexOf('curriculum') + 1}
        total={SHEETS.length}
      />
    </section>
  )
}

/**
 * The child's own work, at the back of the portfolio where the packet keeps it.
 *
 * The picker takes as many files as the parent selects — a whole folder of
 * scans in one go — and each one becomes its own sample, titled from the file
 * name so nothing arrives nameless. Files are uploaded one by one on purpose:
 * one that fails is reported by name and the rest still land.
 */
function SamplesPage({
  year,
  student,
  add,
  set,
  remove,
  busy,
  printing,
}: {
  year: MonthlyYear
  student: Student
  add: (files: File[]) => void
  set: (id: string, patch: Partial<MonthlySample>) => void
  remove: (id: string) => void
  busy: boolean
  printing: boolean
}) {
  const [over, setOver] = useState(false)

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length) add(files)
  }

  return (
    <section className="sheet doc-sheet">
      <div className="kicker">Samples of Work</div>
      <h2 className="sheet-title" style={{ fontSize: 34, margin: '6px 0 0' }}>
        Work samples
      </h2>
      <p className="no-print sheet-note" style={{ margin: '10px 0 16px', fontSize: 11 }}>
        Photographs of pages, worksheets, drawings, scanned PDFs. Choose as many files as you
        like — each one is filed on its own and you can name it afterwards.
      </p>

      <label
        className="drop-zone no-print"
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files)
        }}
      >
        <span style={{ fontSize: 13 }}>
          {busy ? 'Uploading…' : 'Choose files or drop them here — you can pick several at once'}
        </span>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          aria-label="Work sample files"
          disabled={busy}
          onChange={(e) => {
            take(e.target.files)
            // Cleared so choosing the same file twice still fires a change.
            e.target.value = ''
          }}
        />
      </label>

      {year.samples.length === 0 ? (
        <p className="empty-state" style={{ marginTop: 16 }}>
          Nothing uploaded yet.
        </p>
      ) : (
        <div className="sample-grid">
          {year.samples.map((sample) => (
            <figure key={sample.id} className="sample-card">
              <FilePlate
                url={sample.url}
                mime={sample.mime}
                title={sample.title || sample.file_name}
                height="150px"
                fit="contain"
                placeholder="the child’s work"
              />
              {/* On paper a scanned page goes in whole. The card's thumbnail
                  is a way to find it on screen, not evidence of the work. */}
              {printing && isPdf(sample.mime) && sample.url && (
                <div className="print-only sample-full">
                  <PdfPages url={sample.url} label={sample.title || sample.file_name} />
                </div>
              )}
              <input
                className="cell-input"
                value={sample.title}
                placeholder="What this is"
                aria-label={`Title for ${sample.file_name}`}
                onChange={(e) => set(sample.id, { title: e.target.value })}
              />
              <span className="print-only cell-printed">{sample.title}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="cell-input"
                  value={sample.subject}
                  placeholder="Subject"
                  aria-label={`Subject for ${sample.file_name}`}
                  onChange={(e) => set(sample.id, { subject: e.target.value })}
                />
                <span className="print-only cell-printed">{sample.subject}</span>
                <input
                  className="cell-input"
                  type="date"
                  value={sample.sample_date}
                  aria-label={`Date for ${sample.file_name}`}
                  onChange={(e) => set(sample.id, { sample_date: e.target.value })}
                />
                <span className="print-only cell-printed">{sample.sample_date ? fmtDate(sample.sample_date) : ''}</span>
              </div>
              <figcaption
                className="sample-meta"
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {sample.file_name}
                </span>
                <span className="no-print" style={{ display: 'flex', alignItems: 'center' }}>
                  <ViewButton
                    url={sample.url}
                    mime={sample.mime}
                    title={sample.title || sample.file_name}
                  />
                <span className="print-only cell-printed">{sample.sample_date ? fmtDate(sample.sample_date) : ''}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 11 }}
                    aria-label={`Remove ${sample.title || sample.file_name}`}
                    onClick={() => remove(sample.id)}
                  >
                    Remove
                  </button>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      )}

      <SheetFoot
        student={student}
        year={year}
        sheet="Work samples"
        index={SHEETS.indexOf('samples') + 1}
        total={SHEETS.length}
      />
    </section>
  )
}

/**
 * The last sheet: everything the folder carries that is neither the log, the
 * materials nor the child's work — the Letter of Intent, the evaluation, a
 * medical letter.
 *
 * These print in full, page by page, rather than as a thumbnail with a note
 * saying a file is attached. A portfolio that has to be produced on fifteen
 * days' notice is worth nothing if the documents in it are only referenced.
 */
function DocumentsPage({
  year,
  student,
  add,
  set,
  remove,
  busy,
}: {
  year: MonthlyYear
  student: Student
  add: (files: File[]) => void
  set: (id: string, patch: Partial<MonthlyDocument>) => void
  remove: (id: string) => void
  busy: boolean
}) {
  const [over, setOver] = useState(false)

  const take = (list: FileList | null) => {
    const files = Array.from(list ?? [])
    if (files.length) add(files)
  }

  return (
    <section className="sheet doc-sheet">
      <div className="kicker">Additional Documents</div>
      <h2 className="sheet-title" style={{ fontSize: 34, margin: '6px 0 0' }}>
        Additional documents
      </h2>
      <p className="no-print sheet-note" style={{ margin: '10px 0 16px', fontSize: 11 }}>
        The Letter of Intent, the annual evaluation, immunization records, certificates — anything
        else this portfolio has to carry. Each one prints in full at the back.
      </p>

      <label
        className="drop-zone no-print"
        data-over={over || undefined}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          take(e.dataTransfer.files)
        }}
      >
        <span style={{ fontSize: 13 }}>
          {busy ? 'Uploading…' : 'Choose files or drop them here — several at once is fine'}
        </span>
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          aria-label="Additional document files"
          disabled={busy}
          onChange={(e) => {
            take(e.target.files)
            e.target.value = ''
          }}
        />
      </label>

      {year.documents.length === 0 ? (
        <p className="empty-state" style={{ marginTop: 16 }}>
          Nothing attached yet.
        </p>
      ) : (
        <div style={{ marginTop: 20 }}>
          {year.documents.map((doc) => (
            <article key={doc.id} className="document-block">
              <div className="document-head">
                <input
                  className="cell-input"
                  style={{ fontSize: 15 }}
                  value={doc.title}
                  placeholder="What this document is"
                  aria-label={`Title for ${doc.file_name}`}
                  onChange={(e) => set(doc.id, { title: e.target.value })}
                />
                <span className="print-only cell-printed">{doc.title}</span>
                <div className="no-print" style={{ display: 'flex', alignItems: 'center' }}>
                  <ViewButton
                    url={doc.url}
                    mime={doc.mime}
                    title={doc.title || doc.file_name}
                  />
                <span className="print-only cell-printed">{doc.title}</span>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ fontSize: 12 }}
                    aria-label={`Remove ${doc.title || doc.file_name}`}
                    onClick={() => remove(doc.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="document-meta">
                <label>
                  <span className="rule-label">Type</span>
                  <select
                    className="cell-input"
                    value={doc.kind}
                    aria-label={`Type of ${doc.file_name}`}
                    onChange={(e) => set(doc.id, { kind: e.target.value })}
                  >
                    {DOCUMENT_KINDS.map((kind) => (
                      <option key={kind} value={kind}>
                        {kind}
                      </option>
                    ))}
                  </select>
                  <span className="print-only cell-printed kind-printed">{doc.kind}</span>
                </label>
                <label>
                  <span className="rule-label">Date</span>
                  <input
                    className="cell-input"
                    type="date"
                    value={doc.document_date}
                    aria-label={`Date of ${doc.file_name}`}
                    onChange={(e) => set(doc.id, { document_date: e.target.value })}
                  />
                  <span className="print-only cell-printed">
                    {doc.document_date ? fmtDate(doc.document_date) : ''}
                  </span>
                </label>
                <label style={{ flex: 2 }}>
                  <span className="rule-label">Note</span>
                  <input
                    className="cell-input"
                    value={doc.note}
                    placeholder="Anything a reader should know"
                    aria-label={`Note on ${doc.file_name}`}
                    onChange={(e) => set(doc.id, { note: e.target.value })}
                  />
                  <span className="print-only cell-printed">{doc.note}</span>
                </label>
              </div>

              {isPdf(doc.mime) && doc.url ? (
                <PdfPages url={doc.url} label={doc.title || doc.file_name} />
              ) : (
                <FilePlate
                  url={doc.url}
                  mime={doc.mime}
                  title={doc.title || doc.file_name}
                  height="260px"
                  fit="contain"
                  placeholder="the document"
                />
              )}
              <div className="sample-meta">{doc.file_name}</div>
            </article>
          ))}
        </div>
      )}
      <SheetFoot
        student={student}
        year={year}
        sheet="Additional documents"
        index={SHEETS.indexOf('documents') + 1}
        total={SHEETS.length}
      />
    </section>
  )
}
