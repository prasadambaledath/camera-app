import { resizeAndCompressUntilLimit, type ResizedImageResult } from './resizeAndCompressUntilLimit'

export type ProcessedCapture = ResizedImageResult & {
  format64: string
}

/**
 * iTrac NewImageUpload.processFile(): resize/compress, then keep the raw
 * base64 payload the same way UDF/test images land in component state.
 */
export async function processCapturedFile(file: File): Promise<ProcessedCapture> {
  if (file.type && !file.type.startsWith('image/')) {
    throw new Error('File is not an image')
  }

  const resized = await resizeAndCompressUntilLimit(file)
  const format64 = resized.uri.split(',')[1] ?? ''
  return { ...resized, format64 }
}
