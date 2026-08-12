import { useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
// Vite emits the worker as its own same-origin asset, so no CDN is involved
// and the page's Content-Security-Policy stays closed to third parties.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** Beyond this a scanned IEP would swamp the portfolio it is attached to. */
const MAX_PAGES = 12

/** Rendered wide enough to stay sharp on paper at roughly 150 dpi. */
const RENDER_WIDTH = 1100

/**
 * Draws an uploaded PDF into the document so the evaluator actually sees it.
 *
 * An <embed> or <iframe> is not an option: browsers do not paginate embedded
 * PDFs into the printed output, so the page would come out blank. Canvases
 * print like images do.
 */
export function PdfPages({ url, label }: { url: string; label: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [pages, setPages] = useState(0)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let cancelled = false
    const container = host.current
    if (!container) return

    async function render() {
      try {
        const doc = await pdfjs.getDocument({ url }).promise
        if (cancelled) return
        setTotal(doc.numPages)
        const shown = Math.min(doc.numPages, MAX_PAGES)

        for (let n = 1; n <= shown; n++) {
          const page = await doc.getPage(n)
          if (cancelled) return

          const base = page.getViewport({ scale: 1 })
          const viewport = page.getViewport({ scale: RENDER_WIDTH / base.width })
          const canvas = document.createElement('canvas')
          canvas.width = viewport.width
          canvas.height = viewport.height
          const context = canvas.getContext('2d')
          if (!context) continue

          await page.render({ canvas, canvasContext: context, viewport }).promise
          if (cancelled) return
          container!.appendChild(canvas)
          setPages(n)
        }
        if (!cancelled) setState('ready')
      } catch {
        if (!cancelled) setState('failed')
      }
    }

    render()
    return () => {
      cancelled = true
      container.replaceChildren()
    }
  }, [url])

  return (
    <div>
      {state === 'loading' && (
        <p className="pdf-note">Rendering {label}…</p>
      )}
      {state === 'failed' && (
        <p className="pdf-note">
          {label} could not be rendered here. The file itself is still attached to this
          portfolio.
        </p>
      )}
      {state === 'ready' && total > pages && (
        <p className="pdf-note">
          Showing the first {pages} of {total} pages. The complete file is attached.
        </p>
      )}
      <div className="pdf-pages" ref={host} />
    </div>
  )
}
