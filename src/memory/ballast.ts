export type LoadLevel = 'off' | 'low' | 'medium' | 'high'

export type BallastPreset = {
  label: string
  buffersMB: number
  photoCount: number
  formRows: number
  useBitmaps: boolean
}

export const LOAD_LEVELS: LoadLevel[] = ['off', 'low', 'medium', 'high']

export const BALLAST_PRESETS: Record<LoadLevel, BallastPreset> = {
  off: { label: 'Off', buffersMB: 0, photoCount: 0, formRows: 0, useBitmaps: false },
  low: { label: 'Low', buffersMB: 24, photoCount: 6, formRows: 24, useBitmaps: false },
  medium: { label: 'Medium', buffersMB: 80, photoCount: 20, formRows: 80, useBitmaps: false },
  high: { label: 'High', buffersMB: 220, photoCount: 40, formRows: 180, useBitmaps: true },
}

const PAGE_SIZE = 4096
const CHUNK_MB = 8
const PHOTO_WIDTH = 1600
const PHOTO_HEIGHT = 1200

type RetainedBallast = {
  buffers: Uint8Array[]
  dataUrls: string[]
  bitmaps: ImageBitmap[]
}

const retained: RetainedBallast = {
  buffers: [],
  dataUrls: [],
  bitmaps: [],
}

export type BallastStats = {
  buffersMB: number
  photoCount: number
  bitmapCount: number
  formRows: number
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

function allocateCommittedBuffer(bytes: number): Uint8Array {
  const buffer = new Uint8Array(bytes)
  for (let offset = 0; offset < buffer.length; offset += PAGE_SIZE) {
    buffer[offset] = 1
  }
  return buffer
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0)
  })
}

async function makeFieldPhoto(useBitmap: boolean): Promise<{ dataUrl: string; bitmap?: ImageBitmap }> {
  const canvas = document.createElement('canvas')
  canvas.width = PHOTO_WIDTH
  canvas.height = PHOTO_HEIGHT
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Could not create canvas context for ballast photos.')
  }

  const imageData = context.createImageData(PHOTO_WIDTH, PHOTO_HEIGHT)
  const pixels = imageData.data
  const seed = Math.floor(Math.random() * 255)
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = (index + seed) & 255
    pixels[index + 1] = (index * 3 + seed) & 255
    pixels[index + 2] = (index * 7 + seed) & 255
    pixels[index + 3] = 255
  }
  context.putImageData(imageData, 0, 0)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) resolve(nextBlob)
        else reject(new Error('Could not encode ballast photo.'))
      },
      'image/jpeg',
      0.92,
    )
  })

  const dataUrl = await blobToDataUrl(blob)
  const bitmap = useBitmap ? await createImageBitmap(blob) : undefined
  return { dataUrl, bitmap }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Could not read ballast photo.'))
    reader.readAsDataURL(blob)
  })
}

export function releaseBallast(): void {
  retained.bitmaps.forEach((bitmap) => bitmap.close())
  retained.buffers = []
  retained.dataUrls = []
  retained.bitmaps = []
}

export async function applyBallast(
  level: LoadLevel,
  onProgress?: (message: string) => void,
): Promise<BallastStats> {
  const preset = BALLAST_PRESETS[level]
  releaseBallast()

  if (level === 'off') {
    onProgress?.('Released memory load')
    return { buffersMB: 0, photoCount: 0, bitmapCount: 0, formRows: 0 }
  }

  const chunkBytes = CHUNK_MB * 1024 * 1024
  const remainingBytes = preset.buffersMB * 1024 * 1024
  let allocated = 0

  while (allocated < remainingBytes) {
    const nextBytes = Math.min(chunkBytes, remainingBytes - allocated)
    retained.buffers.push(allocateCommittedBuffer(nextBytes))
    allocated += nextBytes
    onProgress?.(`Allocating buffers… ${bytesToMB(allocated)} / ${preset.buffersMB} MB`)
    await yieldToUi()
  }

  for (let index = 0; index < preset.photoCount; index += 1) {
    const photo = await makeFieldPhoto(preset.useBitmaps)
    retained.dataUrls.push(photo.dataUrl)
    if (photo.bitmap) {
      retained.bitmaps.push(photo.bitmap)
    }
    onProgress?.(`Keeping photos in memory… ${index + 1} / ${preset.photoCount}`)
    await yieldToUi()
  }

  return {
    buffersMB: preset.buffersMB,
    photoCount: retained.dataUrls.length,
    bitmapCount: retained.bitmaps.length,
    formRows: preset.formRows,
  }
}

export function getRetainedDataUrls(): string[] {
  return retained.dataUrls
}
