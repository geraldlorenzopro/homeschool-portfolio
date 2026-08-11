export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

/**
 * Downscale an image to 900 px on the long edge, JPEG q 0.72 — the same
 * treatment the prototype applies before anything is stored. Keeps portfolios
 * with dozens of photographs inside a sane storage budget.
 */
export function shrinkImage(file: File, maxEdge = 900, quality = 0.72): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not decode the image.'))
      img.onload = () => {
        const scale = Math.min(1, maxEdge / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas is unavailable.'))
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image.'))),
          'image/jpeg',
          quality,
        )
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the file.'))
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })
}

export function isImage(mime: string | null | undefined): boolean {
  return (mime ?? '').startsWith('image/')
}

export function isPdf(mime: string | null | undefined): boolean {
  return (mime ?? '').includes('pdf')
}
