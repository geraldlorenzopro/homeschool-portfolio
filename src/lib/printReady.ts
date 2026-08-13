/**
 * Whether everything on the page has finished drawing itself.
 *
 * The portfolio prints pdf.js canvases and re-encoded photographs, and both
 * arrive after the element that will hold them. Opening the print dialog
 * before they land produces blank pages — which is exactly what happened
 * twice while building the harness that proves this, once because a canvas
 * had not been created yet and once because `[].every()` is true.
 *
 * So the check is: nothing still says it is working, and no image is still
 * loading. Anything that renders asynchronously sets data-print-ready.
 */
export function pendingWork(root: ParentNode = document): number {
  const flagged = root.querySelectorAll('[data-print-ready="false"]').length
  const images = [...root.querySelectorAll('img')].filter(
    (img) => !(img as HTMLImageElement).complete,
  ).length
  return flagged + images
}

export async function waitForPrintReady(
  root: ParentNode = document,
  timeoutMs = 60_000,
): Promise<boolean> {
  const started = Date.now()
  // Two clean passes in a row: a renderer that finishes one page and starts
  // the next would otherwise look idle for an instant.
  let clean = 0
  while (Date.now() - started < timeoutMs) {
    clean = pendingWork(root) === 0 ? clean + 1 : 0
    if (clean >= 2) return true
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  return false
}
