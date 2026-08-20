export type LoadLevel = 'off' | 'low' | 'medium' | 'high'

export type BallastPreset = {
  label: string
  photoCount: number
  formRows: number
}

export const LOAD_LEVELS: LoadLevel[] = ['off', 'low', 'medium', 'high']

/** Realistic checklist/UDF pile-up: a handful of ~1–2MB JPEG data URLs, plus a modest form. */
export const BALLAST_PRESETS: Record<LoadLevel, BallastPreset> = {
  off: { label: 'Off', photoCount: 0, formRows: 0 },
  low: { label: 'Low', photoCount: 5, formRows: 6 },
  medium: { label: 'Med', photoCount: 12, formRows: 12 },
  high: { label: 'High', photoCount: 20, formRows: 18 },
}

const TARGET_JPEG_BYTES = 1.5 * 1024 * 1024
const PHOTO_WIDTH = 1920
const PHOTO_HEIGHT = 1440
const JPEG_QUALITY = 0.92

export type BallastStats = {
  photoCount: number
  formRows: number
  jpegBytes: number
  dataUrlChars: number
  dataUrls: string[]
}

export type HeapSample = {
  usedMB: number
  totalMB: number
  limitMB: number
}

type ChromePerformance = Performance & {
  memory?: {
    usedJSHeapSize: number
    totalJSHeapSize: number
    jsHeapSizeLimit: number
  }
}

function bytesToMB(bytes: number): number {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

export function readHeap(): HeapSample | null {
  const memory = (performance as ChromePerformance).memory
  if (!memory) return null

  return {
    usedMB: bytesToMB(memory.usedJSHeapSize),
    totalMB: bytesToMB(memory.totalJSHeapSize),
    limitMB: bytesToMB(memory.jsHeapSizeLimit),
  }
}

export function dataUrlHeapMB(dataUrlChars: number): number {
  // JS strings are UTF-16, so a base64 data URL costs ~2 bytes per character on the heap.
  return bytesToMB(dataUrlChars * 2)
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

function fillNoise(context: CanvasRenderingContext2D, width: number, height: number, seed: number): void {
  const imageData = context.createImageData(width, height)
  const pixels = imageData.data
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = (index + seed) & 255
    pixels[index + 1] = (index * 3 + seed) & 255
    pixels[index + 2] = (index * 7 + seed) & 255
    pixels[index + 3] = 255
  }
  context.putImageData(imageData, 0, 0)
}

async function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Could not encode ballast photo.'))
      },
      'image/jpeg',
      quality,
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read ballast photo.'))
    reader.readAsDataURL(blob)
  })
}

async function makeFieldPhoto(index: number): Promise<{ dataUrl: string; jpegBytes: number }> {
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_WIDTH
  canvas.height = PHOTO_HEIGHT
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Could not create canvas context for ballast photos.')
  }

  fillNoise(context, PHOTO_WIDTH, PHOTO_HEIGHT, (index + 1) * 97)
  let quality = JPEG_QUALITY
  let blob = await canvasToJpeg(canvas, quality)

  // Noisy field-photo sized JPEGs should land near 1–2MB. Nudge quality if this device encodes small.
  if (blob.size < 1024 * 1024 && quality < 0.98) {
    quality = 0.98
    blob = await canvasToJpeg(canvas, quality)
  }

  const dataUrl = await blobToDataUrl(blob)
  return { dataUrl, jpegBytes: blob.size }
}

export async function applyBallast(
  level: LoadLevel,
  onProgress?: (message: string) => void,
): Promise<BallastStats> {
  const preset = BALLAST_PRESETS[level]

  if (level === 'off') {
    onProgress?.('Released in-memory photos')
    return { photoCount: 0, formRows: 0, jpegBytes: 0, dataUrlChars: 0, dataUrls: [] }
  }

  const dataUrls: string[] = []
  let jpegBytes = 0
  let dataUrlChars = 0

  for (let index = 0; index < preset.photoCount; index += 1) {
    onProgress?.(`Encoding UDF-style JPEG ${index + 1} / ${preset.photoCount} (~${bytesToMB(TARGET_JPEG_BYTES)} MB each)`)
    const photo = await makeFieldPhoto(index)
    dataUrls.push(photo.dataUrl)
    jpegBytes += photo.jpegBytes
    dataUrlChars += photo.dataUrl.length
    await yieldToUi()
  }

  return {
    photoCount: dataUrls.length,
    formRows: preset.formRows,
    jpegBytes,
    dataUrlChars,
    dataUrls,
  }
}
