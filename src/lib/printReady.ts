/**
 * Tells every lazy image to load now.
 *
 * Photographs are lazy on purpose — a folder of twenty-nine work samples
 * should not fetch them all to show the cover. But a lazy image below the
 * fold never loads, and waiting for one is waiting forever: printing the
 * whole folder mounts seventeen sheets, so almost every sample sits far off
 * screen. The wait and the browser each sat there expecting the other.
 */
export function loadEverything(root: ParentNode = document): void {
  for (const img of root.querySelectorAll('img[loading="lazy"]')) {
    ;(img as HTMLImageElement).loading = 'eager'
  }
}

/** What is still being drawn, and what will never draw at all. */
export interface PrintState {
  /** Canvases and images still working. Wait for these. */
  pending: number
  /** Images that failed. Waiting will not help — these must be reported. */
  broken: number
}

export function printState(root: ParentNode = document): PrintState {
  const images = [...root.querySelectorAll('img')] as HTMLImageElement[]
  return {
    pending:
      root.querySelectorAll('[data-print-ready="false"]').length +
      images.filter((img) => img.src && !img.complete).length,
    // `complete` is true for an image that failed to load, which is how a
    // folder of expired signed URLs sails through a readiness check and
    // prints as blank paper. naturalWidth is the honest signal.
    broken: images.filter((img) => img.src && img.complete && img.naturalWidth === 0).length,
  }
}

/**
 * Waits until nothing is still drawing.
 *
 * The portfolio prints pdf.js canvases and photographs served through signed
 * URLs, and both arrive after the element that will hold them. Opening the
 * print dialog early produces blank pages — which happened twice while the
 * harness that proves this was being written.
 */
export async function waitForPrintReady(
  root: ParentNode = document,
  timeoutMs = 180_000,
): Promise<PrintState & { timedOut: boolean }> {
  const started = Date.now()
  // Two clean passes in a row: a renderer that finishes one page and starts
  // the next would otherwise look idle for an instant.
  let clean = 0
  let state = printState(root)
  while (Date.now() - started < timeoutMs) {
    state = printState(root)
    clean = state.pending === 0 ? clean + 1 : 0
    if (clean >= 2) return { ...state, timedOut: false }
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  // Out of time with work outstanding. Printing now would put blank paper
  // where the child's work goes, which is the whole failure this guards.
  return { ...state, timedOut: true }
}
