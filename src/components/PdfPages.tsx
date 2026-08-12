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

/** Draws `count` pages of a PDF into `host`. Returns the document's page total. */
async function drawPages(
  url: string,
  host: HTMLElement,
  count: number,
  width: number,
  onPage: (n: number) => void,
  cancelled: () => boolean,
): Promise<number> {
  const doc = await pdfjs.getDocument({ url }).promise
  if (cancelled()) return doc.numPages
  const shown = Math.min(doc.numPages, count)

  for (let n = 1; n <= shown; n++) {
    const page = await doc.getPage(n)
    if (cancelled()) return doc.numPages

    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: width / base.width })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const context = canvas.getContext('2d')
    if (!context) continue

    await page.render({ canvas, canvasContext: context, viewport }).promise
    if (cancelled()) return doc.numPages
    host.appendChild(canvas)
    onPage(n)
  }
  return doc.numPages
}

/**
 * Draws an uploaded PDF so the evaluator actually sees it.
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
    let stopped = false
    const container = host.current
    if (!container) return

    drawPages(url, container, MAX_PAGES, RENDER_WIDTH, setPages, () => stopped)
      .then((n) => {
        if (!stopped) {
          setTotal(n)
          setState('ready')
        }
      })
      .catch(() => {
        if (!stopped) setState('failed')
      })

    return () => {
      stopped = true
      container.replaceChildren()
    }
  }, [url])

  return (
    <div>
      {state === 'loading' && <p className="pdf-note">Rendering {label}…</p>}
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

/**
 * The first page of a PDF, sized like a photograph's thumbnail — so a card
 * shows the document itself rather than a placeholder that says one exists.
 */
export function PdfThumb({ url, height }: { url: string; height: string }) {
  const host = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    let stopped = false
    const container = host.current
    if (!container) return

    drawPages(url, container, 1, 700, () => {}, () => stopped)
      .then(() => !stopped && setState('ready'))
      .catch(() => !stopped && setState('failed'))

    return () => {
      stopped = true
      container.replaceChildren()
    }
  }, [url])

  return (
    <div
      className="pdf-thumb"
      data-state={state}
      style={{ height }}
      ref={host}
      aria-label={state === 'ready' ? 'First page' : 'PDF preview'}
    />
  )
}
