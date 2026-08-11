import { MAX_UPLOAD_BYTES, isImage, isPdf, shrinkImage } from './image'

export interface PreparedUpload {
  blob: Blob
  /** The content type actually stored — derived here, never trusted from the file. */
  mime: string
}

/**
 * The single gate every attachment passes through, in both backends.
 *
 * A browser reports `File.type` from the file extension, so it is attacker-
 * controllable and cannot decide what gets stored. Images are re-encoded
 * through a canvas, which both shrinks them and discards everything that is
 * not pixels — EXIF included, so a photograph of a child's worksheet does not
 * carry the home's GPS coordinates into a document sent to an evaluator. PDFs
 * are checked for their magic bytes so an HTML file cannot be filed as one.
 */
export async function prepareUpload(file: File): Promise<PreparedUpload> {
  if (file.size === 0) {
    throw new Error('That file is empty.')
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('That file is over the 15 MB limit.')
  }

  if (isImage(file.type)) {
    return { blob: await shrinkImage(file), mime: 'image/jpeg' }
  }

  if (isPdf(file.type)) {
    await assertRealPdf(file)
    return { blob: file, mime: 'application/pdf' }
  }

  throw new Error('Only images and PDF files can be attached.')
}

async function assertRealPdf(file: File): Promise<void> {
  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer())
  const signature = String.fromCharCode(...header)
  if (signature !== '%PDF-') {
    throw new Error('That file is not a valid PDF.')
  }
}
