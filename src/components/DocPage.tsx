import type { ReactNode } from 'react'

/**
 * <doc-page> is the paged-document web component shipped with the design
 * handoff (public/doc-page.js, declared in src/types/doc-page.d.ts). It owns
 * the sheet box, the running header and footer slots and the @page rule, so
 * the printed result matches the design exactly — we only pass content in.
 */
export type PaperSize = 'letter' | 'a4'

export function DocPage({
  size,
  header,
  footer,
  children,
}: {
  size: PaperSize
  header: ReactNode
  footer: ReactNode
  children: ReactNode
}) {
  return (
    <doc-page margin="0.8in" size={size}>
      <div slot="header" style={HEADER_STYLE}>
        {header}
      </div>
      {children}
      <div slot="footer" style={FOOTER_STYLE}>
        {footer}
      </div>
    </doc-page>
  )
}

const HEADER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '9pt',
  letterSpacing: '0.04em',
  color: '#605d5d',
  borderBottom: '1px solid #d7d3d3',
  paddingBottom: '6pt',
} as const

const FOOTER_STYLE = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '8.5pt',
  color: '#7d7979',
  borderTop: '1px solid #d7d3d3',
  paddingTop: '6pt',
} as const
