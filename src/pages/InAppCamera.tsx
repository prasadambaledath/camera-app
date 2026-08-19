import { useEffect, useRef, useState } from 'react'
import { PhotoGallery, type CapturedImage } from '../components/PhotoGallery'

type FacingMode = 'user' | 'environment'

export function InAppCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isCameraOn, setIsCameraOn] = useState(false)
  const [facingMode, setFacingMode] = useState<FacingMode>('environment')
  const [error, setError] = useState<string | null>(null)
  const [images, setImages] = useState<CapturedImage[]>([])

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
  }

  const startCamera = async (nextFacing: FacingMode = facingMode) => {
    setError(null)

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('In-app camera is not supported in this browser. Use Device Camera instead.')
      return
    }

    stopCamera()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: nextFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play()
      }
      setIsCameraOn(true)
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Allow access or use Device Camera.'
          : 'Could not open the in-app camera. Try Device Camera instead.'
      setError(message)
      setIsCameraOn(false)
    }
  }

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isCameraOn) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return

    context.drawImage(video, 0, 0, width, height)
    const url = canvas.toDataURL('image/jpeg', 0.92)
    setImages((current) => [{ id: crypto.randomUUID(), url }, ...current])
  }

  const switchCamera = () => {
    const nextFacing: FacingMode = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(nextFacing)
    void startCamera(nextFacing)
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
      stopCamera()
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
        In-App camera opens a live preview in the page so you can capture a photo without leaving the browser.
      </p>

      <section className="camera" aria-label="In-app camera capture">
        <div className={`camera__stage${isCameraOn ? ' camera__stage--live' : ''}`}>
          <video
            ref={videoRef}
            className="camera__video"
            autoPlay
            muted
            playsInline
          />
          {!isCameraOn && (
            <div className="camera__placeholder">
              <p>Camera is off</p>
              <span>Start the live preview to capture a photo in the browser.</span>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="camera__canvas" hidden />

        <div className="camera__actions">
          {isCameraOn ? (
            <>
              <button type="button" className="button button--primary" onClick={captureFrame}>
                Capture
              </button>
              <button type="button" className="button" onClick={switchCamera}>
                Flip Camera
              </button>
              <button type="button" className="button" onClick={stopCamera}>
                Cancel
              </button>
            </>
          ) : (
            <button type="button" className="button button--primary" onClick={() => void startCamera()}>
              Capture Photo
            </button>
          )}
        </div>

        {error && <p className="app__error" role="alert">{error}</p>}
      </section>

      <PhotoGallery images={images} onRemove={removeImage} />
    </>
  )
}
