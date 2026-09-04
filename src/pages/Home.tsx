import { useEffect, useRef, useState, type ChangeEvent } from 'react'

export function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const onFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(file)
    })
  }

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  return (
    <section className="camera" aria-label="Capture photo">
      <p>Just capture a photo from device camera and it will be previewed here.</p>
      <div className="camera__actions">
        <button
          type="button"
          className="button button--primary"
          onClick={() => fileInputRef.current?.click()}
        >
          Capture photo
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

      {previewUrl && (
        <img className="home__preview" src={previewUrl} alt="Captured photo" />
      )}
    </section>
  )
}
