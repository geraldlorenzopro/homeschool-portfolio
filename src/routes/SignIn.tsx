import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function SignIn() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !supabase) return
    setStatus('sending')
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) {
      setError(error.message)
      setStatus('idle')
    } else {
      setStatus('sent')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
      }}
    >
      <div style={{ width: 'min(420px, 100%)' }}>
        <div className="kicker">State of Florida · Home Education Program</div>
        <h1 style={{ fontSize: 38, fontWeight: 400, margin: '10px 0 6px' }}>
          Homeschool Portfolio
        </h1>
        <p style={{ fontSize: 14, opacity: 0.75, lineHeight: 1.6, margin: '0 0 24px' }}>
          Record the school year as it happens, then generate the annual evaluation portfolio your
          evaluator needs. Sign in with your email — we send a link, there is no password to keep.
        </p>

        {status === 'sent' ? (
          <div className="card">
            <span className="card-kicker">Check your inbox</span>
            <p className="card-body" style={{ margin: 0 }}>
              A sign-in link is on its way to <strong>{email}</strong>. Open it on this device and
              you will land straight in your portfolio.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label htmlFor="signin-email">Email address</label>
              <input
                id="signin-email"
                className="input"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ alignSelf: 'flex-start' }}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? 'Sending…' : 'Send sign-in link'}
            </button>
            {error && (
              <p style={{ fontSize: 13, color: 'var(--color-accent-800)', margin: 0 }}>{error}</p>
            )}
          </form>
        )}

        <hr className="hr" />
        <p style={{ fontSize: 12, opacity: 0.6, lineHeight: 1.6, margin: 0 }}>
          Uploaded IEPs and work samples are stored privately and are only ever served to you
          through short-lived signed links.
        </p>
      </div>
    </div>
  )
}
