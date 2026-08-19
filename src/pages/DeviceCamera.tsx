import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { PhotoGallery, type CapturedImage } from '../components/PhotoGallery'

export function DeviceCamera() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<CapturedImage[]>([])
  const latest = images[0]

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files?.length) return

    const nextImages = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
    }))
    setImages((current) => [...nextImages, ...current])
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
      <p className="app__lede">
        Device Camera opens the native camera on Android and iOS so you can capture a photo there.
      </p>

      <section className="camera" aria-label="Device camera capture">
        <div className="camera__stage">
          {latest ? (
            <img className="camera__preview" src={latest.url} alt="Latest captured photo" />
          ) : (
            <div className="camera__placeholder">
              <p>Ready to capture</p>
              <span>Tap Take photo to open your phone’s camera app.</span>
            </div>
          )}
        </div>

        <div className="camera__actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => fileInputRef.current?.click()}
          >
            Take photo
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
