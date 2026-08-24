import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { PhotoGallery, type CapturedImage } from '../components/PhotoGallery'
import { processCapturedFile } from '../image/processFile'
import { useMemoryLoad } from '../memory/MemoryLoadContext'

export function DeviceCamera() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<CapturedImage[]>([])
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { markHandoff, clearHandoff, resizeEnabled, setResizeEnabled } = useMemoryLoad()

  const onFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setError(null)

    if (!resizeEnabled) {
      setImages((current) => [
        { id: crypto.randomUUID(), url: URL.createObjectURL(file) },
        ...current,
      ])
      clearHandoff()
      return
    }

    setProcessing(true)
    try {
      const processed = await processCapturedFile(file)
      setImages((current) => [
        { id: crypto.randomUUID(), url: processed.uri },
        ...current,
      ])
      clearHandoff()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process captured photo.')
    } finally {
      setProcessing(false)
    }
  }

  const removeImage = (id: string) => {
    setImages((current) => {
      const target = current.find((image) => image.id === id)
      if (target?.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url)
      }
      return current.filter((image) => image.id !== id)
    })
  }

  useEffect(() => {
    return () => {
      images.forEach((image) => {
        if (image.url.startsWith('blob:')) {
          URL.revokeObjectURL(image.url)
        }
      })
    }
    // Cleanup only on unmount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      <p>
        Device Camera opens the native camera app so you can capture a photo there.
        After the file returns, iTrac resize runs the same canvas / quality-loop / base64 path as{' '}
        <code>processFile()</code>.
      </p>

      <section className="camera" aria-label="Device camera capture">
        <label className="camera__option">
          <input
            type="checkbox"
            checked={resizeEnabled}
            onChange={(event) => setResizeEnabled(event.target.checked)}
          />
          Resize photo after capture.
        </label>

        <div className="camera__actions">
          <button
            type="button"
            className="button button--primary"
            disabled={processing}
            onClick={() => {
              markHandoff('device')
              fileInputRef.current?.click()
            }}
          >
            {processing ? 'Processing…' : 'Capture Photo'}
          </button>
        </div>

        {processing && (
          <p className="memory__status">
            Running iTrac resizeAndCompressUntilLimit — decode, canvas, toBlob loop, then base64.
          </p>
        )}

        {error && <p className="app__error" role="alert">{error}</p>}

        <input
          ref={fileInputRef}
          className="camera__file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(event) => {
            void onFileSelected(event)
          }}
        />
      </section>

      <PhotoGallery images={images} onRemove={removeImage} />
    </>
  )
}
