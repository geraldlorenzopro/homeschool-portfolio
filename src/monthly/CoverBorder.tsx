/**
 * The school supplies in the corners of the cover.
 *
 * Drawn as vectors rather than dropped in as a picture: this sheet gets
 * printed, and a bitmap that looks fine at 96 dpi on screen prints soft at
 * 300. Nothing is fetched either, so the cover still draws with no network.
 *
 * Four separate squares, one per corner, instead of one image stretched over
 * the page — a single sheet-sized SVG has to be squashed to fit Letter and
 * A4, and squashing turns a pair of scissors into a pair of tongs.
 *
 * They sit in the corners rather than in a band around the edge: the middle
 * of the page is the child's photograph, and a full band costs roughly a
 * cartridge across a folder this size.
 */

/** Flat, few paths each, no gradients — this has to survive a home printer. */
const PENCIL = (
  <>
    <rect x="0" y="-5" width="46" height="10" rx="2" fill="#f7c948" />
    <rect x="0" y="-5" width="8" height="10" rx="2" fill="#f2a0b5" />
    <rect x="8" y="-5" width="4" height="10" fill="#c9cdd4" />
    <path d="M46 -5 L58 0 L46 5 Z" fill="#d9a273" />
    <path d="M53.5 -2.7 L58 0 L53.5 2.7 Z" fill="#2b2b2b" />
  </>
)

const RULER = (
  <>
    <rect x="0" y="-6" width="62" height="12" rx="2" fill="#e2574c" />
    <g stroke="#fff" strokeWidth="1.1" opacity=".9">
      <path d="M8 6 V0M16 6 V2M24 6 V0M32 6 V2M40 6 V0M48 6 V2M56 6 V0" />
    </g>
  </>
)

const CLIP_PATH = 'M4 20 V8 a5.5 5.5 0 0 1 11 0 V23 a5.5 5.5 0 0 1-11 0 V12'

const BOOKS = (
  <>
    <rect x="0" y="14" width="44" height="8" rx="1.5" fill="#e8a33d" />
    <rect x="3" y="6" width="40" height="8" rx="1.5" fill="#7fb8a4" />
    <rect x="1" y="-2" width="43" height="8" rx="1.5" fill="#e2574c" />
    <rect x="30" y="-2" width="4" height="24" fill="#fff" opacity=".55" />
  </>
)

const SCISSORS = (
  <g strokeLinecap="round" fill="none">
    <path d="M2 2 L22 20" stroke="#b9bec7" strokeWidth="3.4" />
    <path d="M22 2 L2 20" stroke="#cfd4db" strokeWidth="3.4" />
    <circle cx="24" cy="1" r="4" stroke="#ea3f8a" strokeWidth="2.6" />
    <circle cx="24" cy="21" r="4" stroke="#ea3f8a" strokeWidth="2.6" />
  </g>
)

const COLOUR_PENCILS = (
  <>
    <rect x="0" y="0" width="7" height="34" rx="1.5" fill="#e2574c" />
    <rect x="9" y="4" width="7" height="30" rx="1.5" fill="#f7c948" />
    <rect x="18" y="1" width="7" height="33" rx="1.5" fill="#4aa3df" />
    <rect x="27" y="6" width="7" height="28" rx="1.5" fill="#5cb85c" />
  </>
)

const SHARPENER = (
  <>
    <rect x="0" y="0" width="26" height="15" rx="3" fill="#9b5de5" />
    <rect x="6" y="4" width="14" height="7" rx="1" fill="#d8d8de" />
  </>
)

const SET_SQUARE = (
  <path
    d="M0 30 L34 30 L34 2 Z"
    fill="none"
    stroke="#f28c28"
    strokeWidth="4"
    strokeLinejoin="round"
  />
)

function Corner({ at, children }: { at: string; children: React.ReactNode }) {
  return (
    <svg className={`cover-corner cover-corner-${at}`} viewBox="0 0 100 100" aria-hidden="true">
      {children}
    </svg>
  )
}

export function CoverBorder() {
  return (
    <div className="cover-supplies" aria-hidden="true">
      <Corner at="tl">
        <g transform="translate(4,40) rotate(45) scale(1.15)">{PENCIL}</g>
        <g transform="translate(56,6) rotate(16) scale(1.05)" stroke="#e2574c" fill="none" strokeWidth="3.2" strokeLinecap="round">
          <path d={CLIP_PATH} />
        </g>
        <g transform="translate(74,44) rotate(-12) scale(1)" stroke="#4aa3df" fill="none" strokeWidth="3.2" strokeLinecap="round">
          <path d={CLIP_PATH} />
        </g>
      </Corner>

      <Corner at="tr">
        <g transform="translate(6,10) scale(1.2)">{BOOKS}</g>
        <g transform="translate(52,46) rotate(12) scale(1.15)">{COLOUR_PENCILS}</g>
      </Corner>

      <Corner at="bl">
        <g transform="translate(4,16) rotate(-20) scale(1.25)">{SCISSORS}</g>
        <g transform="translate(44,48) scale(1.25)">{SET_SQUARE}</g>
      </Corner>

      <Corner at="br">
        <g transform="translate(8,14) rotate(8) scale(1.35)">{SHARPENER}</g>
        <g transform="translate(2,62) rotate(-8) scale(1.3)">{RULER}</g>
      </Corner>
    </div>
  )
}
