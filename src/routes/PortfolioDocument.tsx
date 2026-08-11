import { useState } from 'react'
import { DocPage, type PaperSize } from '@/components/DocPage'
import { Plate } from '@/components/ui'
import { SUBJECT_TAG_LABEL, byDateAsc, fmtDate, sumHours } from '@/lib/format'
import { isImage, isPdf } from '@/lib/image'
import type { Activity, Portfolio } from '@/lib/types'

export function PortfolioDocument({ portfolio }: { portfolio: Portfolio }) {
  const [paper, setPaper] = useState<PaperSize>('letter')
  const [showHours, setShowHours] = useState(true)
  const [groupBySubject, setGroupBySubject] = useState(true)

  const { student, subjects, activities, curriculums, books, workSamples, supportDocuments } =
    portfolio

  const totalHours = sumHours(activities)
  const subjectNames = subjects.map((s) => s.label)

  const groups = groupBySubject
    ? subjects
        .map((s) => {
          const rows = activities.filter((a) => a.subject_key === s.key).sort(byDateAsc)
          return {
            label: s.label,
            rows,
            summary:
              `${rows.length} entries` +
              (showHours ? `  ·  ${sumHours(rows)} recorded hours` : ''),
          }
        })
        .filter((g) => g.rows.length > 0)
    : [
        {
          label: 'Chronological log',
          rows: [...activities].sort(byDateAsc),
          summary:
            `${activities.length} entries` +
            (showHours ? `  ·  ${totalHours} recorded hours` : ''),
        },
      ].filter((g) => g.rows.length > 0)

  /** In a single chronological list each row still names its subject. */
  const rowTitle = (a: Activity) =>
    groupBySubject
      ? a.title
      : `${subjects.find((s) => s.key === a.subject_key)?.label ?? ''} — ${a.title}`

  const facts: [string, string][] = [
    ['Student', student.name],
    ['Date of birth', fmtDate(student.dob)],
    ['Grade level', student.grade],
    ['School year', student.school_year],
    ['Parent / instructor', student.parent_name],
    ['County of registration', student.county],
    ['Evaluator', student.evaluator],
    [
      'Recorded instructional hours',
      `${totalHours} hours logged across ${subjectNames.join(' and ')}`,
    ],
  ]

  const sortedBooks = [...books].sort(byDateAsc)
  const sortedSamples = [...workSamples].sort(byDateAsc)

  return (
    <div>
      <div className="doc-toolbar no-print">
        <span style={{ fontSize: 13, opacity: 0.7 }}>
          Generated from everything entered in flow A or B — this is the file you hand to the
          evaluator.
        </span>

        <div className="doc-toolbar-options">
          <label className="radio">
            <select
              className="input"
              style={{ minHeight: 30, fontSize: 12 }}
              value={paper}
              onChange={(e) => setPaper(e.target.value as PaperSize)}
              aria-label="Paper size"
            >
              <option value="letter">Letter</option>
              <option value="a4">A4</option>
            </select>
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showHours}
              onChange={(e) => setShowHours(e.target.checked)}
            />
            Show hours
          </label>
          <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={groupBySubject}
              onChange={(e) => setGroupBySubject(e.target.checked)}
            />
            Group by subject
          </label>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Save as PDF
          </button>
        </div>
      </div>

      <DocPage
        size={paper}
        header={
          <>
            <span>{student.name} — Home Education Portfolio</span>
            <span>{student.school_year}</span>
          </>
        }
        footer={
          <>
            <span>
              Home education portfolio · retained two years per s. 1002.41(1)(b), F.S.
            </span>
            <span>{student.parent_name}</span>
          </>
        }
      >
        <div className="doc">
          {/* ── cover ─────────────────────────────────────────────────── */}
          <div style={{ textAlign: 'center', padding: '34pt 0 26pt' }}>
            <div
              style={{
                fontSize: '9pt',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: '#b68235',
              }}
            >
              State of Florida · Home Education Program
            </div>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: '40pt',
                lineHeight: 1.05,
                margin: '14pt 0 8pt',
              }}
            >
              Annual Evaluation Portfolio
            </h1>
            <div style={{ fontSize: '15pt', fontStyle: 'italic' }}>{student.name}</div>
            <div style={{ fontSize: '10pt', color: '#605d5d', marginTop: '6pt' }}>
              {[student.grade, student.school_year, student.county && `${student.county} County`]
                .filter(Boolean)
                .join(' · ')}
            </div>
            <div
              style={{ width: '90pt', height: 1, background: '#b68235', margin: '22pt auto 0' }}
            />
          </div>

          {/* ── student & program record ──────────────────────────────── */}
          <h2 style={{ margin: '26pt 0 8pt' }}>Student &amp; program record</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
            <tbody>
              {facts.map(([k, v]) => (
                <tr key={k}>
                  <td
                    style={{
                      width: '34%',
                      padding: '6pt 0',
                      borderBottom: '1px solid #e5e2e2',
                      color: '#605d5d',
                      fontSize: '9.5pt',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {k}
                  </td>
                  <td style={{ padding: '6pt 0', borderBottom: '1px solid #e5e2e2' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── instructor's statement ────────────────────────────────── */}
          {student.statement.trim() && (
            <>
              <h2 style={{ margin: '26pt 0 6pt' }}>Instructor&rsquo;s statement</h2>
              <p
                style={{
                  fontSize: '10.5pt',
                  lineHeight: 1.65,
                  textAlign: 'justify',
                  margin: 0,
                }}
              >
                {student.statement}
              </p>
            </>
          )}

          {/* ── curriculum ────────────────────────────────────────────── */}
          {curriculums.length > 0 && (
            <>
              <h2 style={{ margin: '26pt 0 6pt' }}>Curriculum used</h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 12pt' }}>
                Programs, textbooks and packaged courses followed during the school year.
              </p>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th className="doc-th">Curriculum</th>
                    <th className="doc-th">Publisher</th>
                    <th className="doc-th">Subject</th>
                  </tr>
                </thead>
                <tbody>
                  {curriculums.map((c) => (
                    <tr key={c.id} className="keep">
                      <td className="doc-td">
                        <div>{c.title}</div>
                        <div style={{ color: '#605d5d', fontSize: '9pt' }}>{c.usage}</div>
                      </td>
                      <td className="doc-td" style={{ color: '#444141' }}>
                        {c.publisher}
                      </td>
                      <td
                        className="doc-td nowrap"
                        style={{ color: '#605d5d', paddingRight: 0 }}
                      >
                        {SUBJECT_TAG_LABEL[c.subject]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── log of educational activities ─────────────────────────── */}
          {groups.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Log of educational activities
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 14pt' }}>
                {groupBySubject
                  ? 'Dated activities, materials and outcomes, grouped by subject.'
                  : 'Dated activities, materials and outcomes, in the order they happened.'}
              </p>
              {groups.map((g) => (
                <div key={g.label} className="keep" style={{ marginBottom: '20pt' }}>
                  <div className="doc-rule-head">
                    <h3>{g.label}</h3>
                    <span className="num" style={{ fontSize: '9pt', color: '#605d5d' }}>
                      {g.summary}
                    </span>
                  </div>
                  <table className="doc-table">
                    <tbody>
                      {g.rows.map((e) => (
                        <tr key={e.id} className="keep">
                          <td
                            className="doc-td num nowrap"
                            style={{ width: '78pt', color: '#605d5d' }}
                          >
                            {fmtDate(e.date)}
                          </td>
                          <td className="doc-td" style={{ paddingRight: 0 }}>
                            <span>{rowTitle(e)}</span>
                            {e.notes && <span style={{ color: '#605d5d' }}> — {e.notes}</span>}
                          </td>
                          {showHours && (
                            <td
                              className="doc-td num"
                              style={{
                                width: '42pt',
                                textAlign: 'right',
                                color: '#605d5d',
                                paddingRight: 0,
                              }}
                            >
                              {e.hours}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </>
          )}

          {/* ── reading list ──────────────────────────────────────────── */}
          {sortedBooks.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Reading list
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 12pt' }}>
                {sortedBooks.length} titles read or shared during the {student.school_year} school
                year.
              </p>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th className="doc-th">Title</th>
                    <th className="doc-th">Author</th>
                    <th className="doc-th">How it was read</th>
                    <th className="doc-th" style={{ textAlign: 'right' }}>
                      Finished
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBooks.map((k) => (
                    <tr key={k.id} className="keep">
                      <td className="doc-td" style={{ fontStyle: 'italic' }}>
                        {k.title}
                      </td>
                      <td className="doc-td" style={{ color: '#444141' }}>
                        {k.author}
                      </td>
                      <td className="doc-td" style={{ color: '#605d5d' }}>
                        {k.how_read}
                      </td>
                      <td
                        className="doc-td num nowrap"
                        style={{ textAlign: 'right', color: '#605d5d', paddingRight: 0 }}
                      >
                        {fmtDate(k.finished_on)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── samples of work ───────────────────────────────────────── */}
          {sortedSamples.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Samples of work
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 16pt' }}>
                Selected materials showing the student&rsquo;s progress across the year.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20pt' }}>
                {sortedSamples.map((w) => (
                  <figure key={w.id} className="keep" style={{ margin: 0 }}>
                    <Plate
                      url={w.url}
                      height="150pt"
                      placeholder="photo or scan of the work"
                    />
                    <figcaption
                      style={{ fontSize: '9.5pt', lineHeight: 1.45, marginTop: '6pt' }}
                    >
                      <div>{w.title}</div>
                      <div style={{ color: '#605d5d' }}>
                        {SUBJECT_TAG_LABEL[w.subject]} · {fmtDate(w.date)}
                      </div>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </>
          )}

          {/* ── support documents ─────────────────────────────────────── */}
          {supportDocuments.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Support documents
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 16pt' }}>
                The student&rsquo;s individualized education program and related plans, filed with
                this portfolio as evidence of the accommodations followed at home.
              </p>
              {supportDocuments.map((f) => (
                <div key={f.id} className="keep" style={{ marginBottom: '22pt' }}>
                  <div className="doc-rule-head">
                    <h3>{f.title}</h3>
                    <span style={{ fontSize: '9pt', color: '#605d5d' }}>
                      {[f.kind, fmtDate(f.document_date), f.file_name].filter(Boolean).join('  ·  ')}
                    </span>
                  </div>
                  {f.note && (
                    <p
                      style={{
                        fontSize: '10pt',
                        lineHeight: 1.6,
                        color: '#444141',
                        margin: '8pt 0 10pt',
                      }}
                    >
                      {f.note}
                    </p>
                  )}
                  <Plate
                    url={isImage(f.mime) ? f.url : null}
                    height="190pt"
                    fit="contain"
                    placeholder={
                      isPdf(f.mime)
                        ? 'PDF attached — filed with this portfolio'
                        : 'document filed with this portfolio'
                    }
                  />
                </div>
              ))}
            </>
          )}

          {/* ── evaluator's certification ─────────────────────────────── */}
          <div
            className="keep"
            style={{ marginTop: '34pt', borderTop: '1px solid #b68235', paddingTop: '14pt' }}
          >
            <h2 style={{ margin: '0 0 6pt' }}>Evaluator&rsquo;s certification</h2>
            <p
              style={{
                fontSize: '10pt',
                lineHeight: 1.6,
                color: '#444141',
                margin: '0 0 26pt',
                textAlign: 'justify',
              }}
            >
              The undersigned Florida-certified teacher has reviewed this portfolio and discussed
              the year&rsquo;s work with the student and parent, in accordance with s.
              1002.41(1)(f), Florida Statutes.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150pt', gap: '30pt' }}>
              <div
                style={{
                  borderBottom: '1px solid #201f1d',
                  paddingBottom: '3pt',
                  fontSize: '10pt',
                }}
              >
                {student.evaluator}
              </div>
              <div
                style={{
                  borderBottom: '1px solid #201f1d',
                  paddingBottom: '3pt',
                  fontSize: '10pt',
                }}
              >
                {fmtDate(student.evaluation_date)}
              </div>
              <div
                style={{
                  fontSize: '8.5pt',
                  color: '#605d5d',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Evaluator signature
              </div>
              <div
                style={{
                  fontSize: '8.5pt',
                  color: '#605d5d',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Date
              </div>
            </div>
          </div>
        </div>
      </DocPage>
    </div>
  )
}
