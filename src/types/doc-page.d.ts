import 'react'

/**
 * <doc-page> is the paged-document custom element shipped with the design
 * handoff and loaded from public/doc-page.js. Declaring it here lets JSX use
 * it directly, so the printed portfolio uses the design's own pagination.
 */
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'doc-page': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        /** Page margin, e.g. "0.8in". */
        margin?: string
        /** letter | a4 | legal */
        size?: string
      }
    }
  }
}
