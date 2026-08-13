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
  timeoutMs = 60_000,
): Promise<PrintState> {
  const started = Date.now()
  // Two clean passes in a row: a renderer that finishes one page and starts
  // the next would otherwise look idle for an instant.
  let clean = 0
  let state = printState(root)
  while (Date.now() - started < timeoutMs) {
    state = printState(root)
    clean = state.pending === 0 ? clean + 1 : 0
    if (clean >= 2) return state
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return state
}
