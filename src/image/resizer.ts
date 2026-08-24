type BitmapOptions = ImageBitmapOptions

async function createBitmap(source: ImageBitmapSource, options: BitmapOptions): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(source, options)
  } catch {
    const { resizeWidth, resizeHeight } = options
    if (resizeWidth != null || resizeHeight != null) {
      try {
        return await createImageBitmap(source, { resizeWidth, resizeHeight })
      } catch {
        // Older engines may reject resize options — decode at full size.
      }
    }
    return createImageBitmap(source)
  }
}

/**
 * Decode a File into an ImageBitmap, applying EXIF orientation and
 * downscaling during decode so a 50MP camera JPEG never materializes a
 * full-resolution RGBA buffer. Ported from iTrac ImageUpload/resizer.ts.
 */
export async function createDownscaledImageBitmap(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<ImageBitmap> {
  const withOrientation: BitmapOptions = {
    imageOrientation: 'from-image',
    resizeQuality: 'high',
  }

  let imageBitmap = await createBitmap(file, {
    ...withOrientation,
    resizeWidth: maxWidth,
  })

  if (imageBitmap.height > maxHeight) {
    const fitted = await createBitmap(imageBitmap, {
      ...withOrientation,
      resizeHeight: maxHeight,
    })
    imageBitmap.close()
    imageBitmap = fitted
  }

  return imageBitmap
}

function fitWithin(
  height: number,
  width: number,
  maxHeight: number,
  maxWidth: number,
): { height: number; width: number } {
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width)
    width = maxWidth
  }
  if (height > maxHeight) {
    width = Math.round((width * maxHeight) / height)
    height = maxHeight
  }
  return { height, width }
}

export function drawResizedImage(
  image: ImageBitmap,
  maxWidth: number,
  maxHeight: number,
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const sized = fitWithin(image.height, image.width, maxHeight, maxWidth)
  const canvas = document.createElement('canvas')
  canvas.width = sized.width
  canvas.height = sized.height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('Could not create canvas context for resize.')
  }
  context.drawImage(image, 0, 0, sized.width, sized.height)
  return { canvas, width: canvas.width, height: canvas.height }
}

export function encodeCanvasToBlob(
  canvas: HTMLCanvasElement,
  qualityPercent: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', qualityPercent / 100)
  })
}

/** iTrac heap path: ArrayBuffer → binary string → btoa data URL. */
export async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }
  return `data:${blob.type || 'image/jpeg'};base64,${btoa(binary)}`
}

export function releaseCanvas(canvas: HTMLCanvasElement): void {
  canvas.width = 0
  canvas.height = 0
}

export async function prepareResizedCanvas(
  file: File,
  maxWidth: number,
  maxHeight: number,
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  const imageBitmap = await createDownscaledImageBitmap(file, maxWidth, maxHeight)
  try {
    return drawResizedImage(imageBitmap, maxWidth, maxHeight)
  } finally {
    imageBitmap.close()
  }
}
