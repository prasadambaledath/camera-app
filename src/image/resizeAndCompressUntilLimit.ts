import {
  blobToDataUrl,
  encodeCanvasToBlob,
  prepareResizedCanvas,
  releaseCanvas,
} from './resizer'

export const TARGET_MAX_WIDTH = 1920
export const TARGET_MAX_HEIGHT = 1080
export const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024

export type ResizedImageResult = {
  uri: string
  height: number
  width: number
  jpegBytes: number
  qualityPercent: number
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const units = ['Bytes', 'KB', 'MB', 'GB']
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024))
  const value = bytes / 1024 ** unitIndex
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)} ${units[unitIndex]}`
}

/** Decode + draw once; re-encode JPEG quality until the blob is ≤ 2 MB. Same as iTrac. */
export async function resizeAndCompressUntilLimit(file: File): Promise<ResizedImageResult> {
  let canvas: HTMLCanvasElement | undefined

  try {
    const prepared = await prepareResizedCanvas(file, TARGET_MAX_WIDTH, TARGET_MAX_HEIGHT)
    canvas = prepared.canvas
    const { width, height } = prepared

    for (let quality = 100; quality >= 10; quality -= 10) {
      const blob = await encodeCanvasToBlob(canvas, quality)
      if (!blob) continue
      if (blob.size <= MAX_IMAGE_SIZE_BYTES) {
        const uri = await blobToDataUrl(blob)
        return { uri, height, width, jpegBytes: blob.size, qualityPercent: quality }
      }
    }

    throw new Error(`Cannot reduce image below ${formatBytes(MAX_IMAGE_SIZE_BYTES)}`)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Cannot reduce image below')) {
      throw error
    }
    throw new Error('Failed to decode image', { cause: error })
  } finally {
    if (canvas) {
      releaseCanvas(canvas)
    }
  }
}
