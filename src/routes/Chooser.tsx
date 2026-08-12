import { Link } from 'react-router-dom'

/**
 * One link, two portfolios. They are separate documents for the same child —
 * the evaluation portfolio is written around IEP goals, the monthly one is the
 * Florida day-by-day log — so this is a fork in the road, not a menu of views.
 */
export function Chooser({ studentName }: { studentName: string }) {
  const who = studentName.trim() || 'this student'

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 90px' }}>
      <div className="kicker">State of Florida · Home Education Program</div>
      <h1 style={{ fontSize: 38, fontWeight: 400, margin: '10px 0 6px' }}>
        Which portfolio are you working on?
      </h1>
      <p style={{ fontSize: 14, opacity: 0.72, lineHeight: 1.6, margin: '0 0 30px', maxWidth: '62ch' }}>
        Both belong to {who} and both satisfy s. 1002.41, F.S. They are kept separately because
        they are different documents — pick the one you are filling in today.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 20,
        }}
      >
        <Link to="/monthly" className="choice">
          <span className="card-kicker">Monthly log · Broward County</span>
          <span className="card-title">Home Education Portfolio</span>
          <span className="card-body">
            The twelve-month record: a grid of the days each subject was covered, reading
            materials, field trips and accomplishments, plus the Notice of Intent, Transfer and
            Termination forms.
          </span>
          <span className="choice-go">Open →</span>
        </Link>

        <Link to="/evaluation" className="choice">
          <span className="card-kicker">Annual evaluation · IEP goals</span>
          <span className="card-title">Annual Evaluation Portfolio</span>
          <span className="card-body">
            Goals by area with the method used and how the child responded, work samples filed
            against the goal they evidence, the child profile and the evaluator's certification.
          </span>
          <span className="choice-go">Open →</span>
        </Link>
      </div>

      <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.6, marginTop: 30, maxWidth: '62ch' }}>
        The student record — name, date of birth, parent — is shared, so changing it in one
        portfolio changes it in both. Everything else is kept apart.
      </p>
    </div>
  )
}
