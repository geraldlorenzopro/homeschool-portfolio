import { useState } from 'react'
import { DocPage, type PaperSize } from '@/components/DocPage'
import { PdfPages } from '@/components/PdfPages'
import { Plate } from '@/components/ui'
import { areaLabel, fmtDate, sumHours } from '@/lib/format'
import { isImage, isPdf } from '@/lib/image'
import {
  GOAL_STATUS_LABEL,
  OUTCOME_LEVEL_LABEL,
  type Entry,
  type Portfolio,
} from '@/lib/types'

export function PortfolioDocument({ portfolio }: { portfolio: Portfolio }) {
  const [paper, setPaper] = useState<PaperSize>('letter')

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
  } = portfolio

  const showDates = student.show_dates
  const showHours = student.show_hours
  const totalHours = sumHours(entries)

  /** Areas that actually have something to show, in the user's own order. */
  const usedAreas = areas.filter(
    (a) => goals.some((g) => g.area_id === a.id) || entries.some((e) => e.area_id === a.id),
  )

  const facts: [string, string][] = [
    ['Student', student.name],
    ['Date of birth', fmtDate(student.dob)],
    ['Grade level', student.grade],
    ['School year', student.school_year],
    ['Parent / instructor', student.parent_name],
    ['County of registration', student.county],
    ['Evaluator', student.evaluator],
    ['Areas of instruction', usedAreas.map((a) => a.label).join(', ')],
    ['Goals recorded', `${goals.length} across ${usedAreas.length} areas`],
    ...(showHours
      ? ([['Recorded instructional hours', `${totalHours} hours`]] as [string, string][])
      : []),
  ]

  const entryDate = (e: Entry) => (showDates ? fmtDate(e.date) : '')

  return (
    <div>
      <div className="doc-toolbar no-print">
        <span style={{ fontSize: 13, opacity: 0.7 }}>
          Generated from everything entered in flow A or B — this is the file you hand to the
          evaluator.
        </span>

        <div className="doc-toolbar-options">
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
          <span style={{ fontSize: 12, opacity: 0.6 }}>
            Dates, hours and the activity log are switched in Student information.
          </span>
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
            <span>Home education portfolio · retained two years per s. 1002.41(1)(b), F.S.</span>
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

          {/* ── child profile (opt-in) ────────────────────────────────── */}
          {student.include_profile && (
            <>
              <h2 style={{ margin: '26pt 0 6pt' }}>Child profile</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5pt' }}>
                <tbody>
                  {(
                    [
                      [
                        'Diagnosis',
                        student.no_formal_diagnosis
                          ? 'No formal diagnosis on record'
                          : [
                              student.diagnosis,
                              student.diagnosis_date && fmtDate(student.diagnosis_date),
                              student.diagnosed_by,
                            ]
                              .filter(Boolean)
                              .join(' · '),
                      ],
                      ['Strengths', student.strengths],
                      ['Needs', student.needs],
                      ['How the child learns best', student.learns_best],
                    ] as [string, string][]
                  )
                    .filter(([, v]) => v.trim() !== '')
                    .map(([k, v]) => (
                      <tr key={k}>
                        <td
                          style={{
                            width: '34%',
                            padding: '6pt 8pt 6pt 0',
                            borderBottom: '1px solid #e5e2e2',
                            color: '#605d5d',
                            fontSize: '9.5pt',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            verticalAlign: 'top',
                          }}
                        >
                          {k}
                        </td>
                        <td
                          style={{
                            padding: '6pt 0',
                            borderBottom: '1px solid #e5e2e2',
                            lineHeight: 1.5,
                          }}
                        >
                          {v}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── instructor's statement ────────────────────────────────── */}
          {student.statement.trim() && (
            <>
              <h2 style={{ margin: '26pt 0 6pt' }}>Instructor&rsquo;s statement</h2>
              <p
                style={{ fontSize: '10.5pt', lineHeight: 1.65, textAlign: 'justify', margin: 0 }}
              >
                {student.statement}
              </p>
            </>
          )}

          {/* ── evaluations ───────────────────────────────────────────── */}
          {evaluations.length > 0 && (
            <>
              <h2 style={{ margin: '26pt 0 6pt' }}>Recent evaluations</h2>
              {evaluations.map((ev) => (
                <div key={ev.id} className="keep" style={{ marginBottom: '14pt' }}>
                  <div className="doc-rule-head">
                    <h3>{ev.title}</h3>
                    <span style={{ fontSize: '9pt', color: '#605d5d' }}>
                      {[ev.kind, fmtDate(ev.evaluation_date), ev.performed_by]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </span>
                  </div>
                  {ev.summary && (
                    <p
                      style={{
                        fontSize: '10pt',
                        lineHeight: 1.6,
                        color: '#444141',
                        margin: '8pt 0 10pt',
                      }}
                    >
                      {ev.summary}
                    </p>
                  )}
                  {ev.url &&
                    (isPdf(ev.mime) ? (
                      <PdfPages url={ev.url} label={ev.title} />
                    ) : (
                      <Plate
                        url={isImage(ev.mime) ? ev.url : null}
                        height="190pt"
                        fit="contain"
                        alt={ev.title}
                        placeholder="report filed with this portfolio"
                      />
                    ))}
                </div>
              ))}
            </>
          )}

          {/* ── goals and the work against them ───────────────────────── */}
          {usedAreas.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Goals and instruction by area
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 14pt' }}>
                For each goal: the method used to work it, and how the student responded.
              </p>

              {usedAreas.map((area) => {
                const areaGoals = goals.filter((g) => g.area_id === area.id)
                const looseEntries = entries.filter(
                  (e) => e.area_id === area.id && !e.goal_id,
                )
                return (
                  <div key={area.id} style={{ marginBottom: '22pt' }}>
                    <div className="doc-rule-head">
                      <h3>{area.label}</h3>
                      <span className="num" style={{ fontSize: '9pt', color: '#605d5d' }}>
                        {areaGoals.length} goal{areaGoals.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {areaGoals.map((goal) => {
                      const sessions = entries.filter((e) => e.goal_id === goal.id)
                      const evidence = workSamples.filter((w) => w.goal_id === goal.id && !w.entry_id)
                      return (
                        <div key={goal.id} className="keep" style={{ margin: '12pt 0 16pt' }}>
                          <div style={{ fontSize: '10.5pt', lineHeight: 1.5 }}>{goal.text}</div>
                          <div
                            style={{
                              fontSize: '8.5pt',
                              color: '#605d5d',
                              letterSpacing: '0.05em',
                              textTransform: 'uppercase',
                              margin: '4pt 0 8pt',
                            }}
                          >
                            {GOAL_STATUS_LABEL[goal.status]} ·{' '}
                            {goal.source === 'iep' ? 'From the official IEP' : 'Parent-written'}
                          </div>

                          {sessions.length === 0 ? (
                            <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: 0 }}>
                              No sessions recorded against this goal.
                            </p>
                          ) : (
                            <table className="doc-table">
                              <tbody>
                                {sessions.map((e) => (
                                  <tr key={e.id} className="keep">
                                    {showDates && (
                                      <td
                                        className="doc-td num nowrap"
                                        style={{ width: '68pt', color: '#605d5d' }}
                                      >
                                        {entryDate(e)}
                                      </td>
                                    )}
                                    <td className="doc-td" style={{ paddingRight: 0 }}>
                                      <div>{e.title}</div>
                                      {e.method && (
                                        <div style={{ color: '#605d5d', fontSize: '9pt' }}>
                                          Method: {e.method}
                                        </div>
                                      )}
                                      {e.outcome && (
                                        <div style={{ color: '#444141', fontSize: '9pt' }}>
                                          Outcome: {e.outcome}
                                          {e.outcome_level &&
                                            ` (${OUTCOME_LEVEL_LABEL[e.outcome_level]})`}
                                        </div>
                                      )}
                                      {workSamples
                                        .filter((w) => w.entry_id === e.id)
                                        .map((w) => (
                                          <div
                                            key={w.id}
                                            className="keep"
                                            style={{ maxWidth: '190pt', marginTop: '6pt' }}
                                          >
                                            <Plate
                                              url={w.url}
                                              height="110pt"
                                              fit="contain"
                                              alt={w.title}
                                              placeholder="photo of the work"
                                            />
                                          </div>
                                        ))}
                                    </td>
                                    {showHours && (
                                      <td
                                        className="doc-td num"
                                        style={{
                                          width: '38pt',
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
                          )}

                          {evidence.length > 0 && (
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '14pt',
                                marginTop: '10pt',
                              }}
                            >
                              {evidence.map((w) => (
                                <figure key={w.id} className="keep" style={{ margin: 0 }}>
                                  <Plate
                                    url={w.url}
                                    height="120pt"
                                    fit="contain"
                                    alt={w.title}
                                    placeholder="photo or scan of the work"
                                  />
                                  <figcaption
                                    style={{ fontSize: '9pt', color: '#605d5d', marginTop: '4pt' }}
                                  >
                                    {w.title}
                                    {showDates && w.date ? ` · ${fmtDate(w.date)}` : ''}
                                  </figcaption>
                                </figure>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {looseEntries.length > 0 && (
                      <div className="keep" style={{ marginTop: '10pt' }}>
                        <div
                          style={{
                            fontSize: '8.5pt',
                            color: '#605d5d',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            marginBottom: '6pt',
                          }}
                        >
                          Other work in this area
                        </div>
                        <table className="doc-table">
                          <tbody>
                            {looseEntries.map((e) => (
                              <tr key={e.id} className="keep">
                                {showDates && (
                                  <td
                                    className="doc-td num nowrap"
                                    style={{ width: '68pt', color: '#605d5d' }}
                                  >
                                    {entryDate(e)}
                                  </td>
                                )}
                                <td className="doc-td" style={{ paddingRight: 0 }}>
                                  <div>{e.title}</div>
                                  {e.outcome && (
                                    <div style={{ color: '#605d5d', fontSize: '9pt' }}>
                                      {e.outcome}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* ── plain chronological log (opt-in) ──────────────────────── */}
          {student.show_activity_log && entries.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Log of educational activities
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 12pt' }}>
                Every session recorded this year, in the order it happened.
              </p>
              <table className="doc-table">
                <tbody>
                  {[...entries]
                    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
                    .map((e) => (
                      <tr key={e.id} className="keep">
                        {showDates && (
                          <td
                            className="doc-td num nowrap"
                            style={{ width: '68pt', color: '#605d5d' }}
                          >
                            {entryDate(e)}
                          </td>
                        )}
                        <td className="doc-td" style={{ paddingRight: 0 }}>
                          <span>{areaLabel(e.area_id, areas)} — {e.title}</span>
                          {e.outcome && (
                            <span style={{ color: '#605d5d' }}> — {e.outcome}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── curriculum ────────────────────────────────────────────── */}
          {curriculums.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Curriculum used
              </h2>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th className="doc-th">Curriculum</th>
                    <th className="doc-th">Publisher</th>
                    <th className="doc-th">Area</th>
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
                      <td className="doc-td nowrap" style={{ color: '#605d5d', paddingRight: 0 }}>
                        {c.area_id ? areaLabel(c.area_id, areas) : 'Multiple areas'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── reading list ──────────────────────────────────────────── */}
          {books.length > 0 && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Reading list
              </h2>
              <p style={{ fontSize: '9.5pt', color: '#605d5d', margin: '0 0 12pt' }}>
                {books.length} titles read or shared during the {student.school_year} school year.
              </p>
              <table className="doc-table">
                <thead>
                  <tr>
                    <th className="doc-th">Title</th>
                    <th className="doc-th">Author</th>
                    <th className="doc-th">How it was read</th>
                    {showDates && (
                      <th className="doc-th" style={{ textAlign: 'right' }}>
                        Finished
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {books.map((k) => (
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
                      {showDates && (
                        <td
                          className="doc-td num nowrap"
                          style={{ textAlign: 'right', color: '#605d5d', paddingRight: 0 }}
                        >
                          {fmtDate(k.finished_on)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {/* ── work samples not already shown beside a goal ───────────── */}
          {workSamples.some((w) => !w.goal_id && !w.entry_id) && (
            <>
              <h2 className="break-page" style={{ margin: '30pt 0 6pt' }}>
                Samples of work
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20pt' }}>
                {workSamples
                  .filter((w) => !w.goal_id && !w.entry_id)
                  .map((w) => (
                    <figure key={w.id} className="keep" style={{ margin: 0 }}>
                      <Plate
                        url={w.url}
                        height="150pt"
                        fit="contain"
                        alt={w.title}
                        placeholder="photo or scan of the work"
                      />
                      <figcaption
                        style={{ fontSize: '9.5pt', lineHeight: 1.45, marginTop: '6pt' }}
                      >
                        <div>{w.title}</div>
                        <div style={{ color: '#605d5d' }}>
                          {[areaLabel(w.area_id, areas), showDates ? fmtDate(w.date) : null]
                            .filter(Boolean)
                            .join(' · ')}
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
                  {isPdf(f.mime) && f.url ? (
                    <PdfPages url={f.url} label={f.title} />
                  ) : (
                    <Plate
                      url={isImage(f.mime) ? f.url : null}
                      height="190pt"
                      fit="contain"
                      alt={f.title}
                      placeholder={
                        isPdf(f.mime)
                          ? 'PDF attached — filed with this portfolio'
                          : 'document filed with this portfolio'
                      }
                    />
                  )}
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
                style={{ borderBottom: '1px solid #201f1d', paddingBottom: '3pt', fontSize: '10pt' }}
              >
                {student.evaluator}
              </div>
              <div
                style={{ borderBottom: '1px solid #201f1d', paddingBottom: '3pt', fontSize: '10pt' }}
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
