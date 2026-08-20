import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { PhotoGallery, type CapturedImage } from '../components/PhotoGallery'
import { useMemoryLoad } from '../memory/MemoryLoadContext'

export function DeviceCamera() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<CapturedImage[]>([])
  const { markHandoff, clearHandoff } = useMemoryLoad()

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    const nextImages = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
    }))
    setImages((current) => [...nextImages, ...current])
    clearHandoff()
    event.target.value = ''
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
      </p>

      <section className="camera" aria-label="Device camera capture">
        <div className="camera__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => {
              markHandoff('device')
              fileInputRef.current?.click()
            }}
          >
            Capture Photo
          </button>
        </div>

        <input
          ref={fileInputRef}
          className="camera__file"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFileSelected}
        />
      </section>

      <PhotoGallery images={images} onRemove={removeImage} />
    </>
  )
}
