export type CapturedImage = {
  id: string
  url: string
}

type PhotoGalleryProps = {
  images: CapturedImage[]
  onRemove: (id: string) => void
}

export function PhotoGallery({ images, onRemove }: PhotoGalleryProps) {
  return (
    <section className="gallery" aria-label="Captured photos">
      <div className="gallery__heading">
        <h2>Photos</h2>
        <span>{images.length} captured</span>
      </div>

      {images.length === 0 ? (
        <p className="gallery__empty">No photos yet. Capture one to see it here.</p>
      ) : (
        <ul className="gallery__grid">
          {images.map((image) => (
            <li key={image.id} className="gallery__item">
              <img src={image.url} alt="Captured from device camera" />
              <button
                type="button"
                className="gallery__remove"
                onClick={() => onRemove(image.id)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
