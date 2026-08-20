import { BALLAST_PRESETS, LOAD_LEVELS } from '../memory/ballast'
import { useMemoryLoad } from '../memory/MemoryLoadContext'
import './MemoryLoadPanel.css'

export function MemoryLoadPanel() {
  const {
    level,
    applying,
    progress,
    error,
    stats,
    formRows,
    heap,
    reloadNotice,
    setLevel,
    dismissReloadNotice,
    copyExperimentLog,
  } = useMemoryLoad()

  const preset = BALLAST_PRESETS[level]

  return (
    <section className="memory" aria-label="Memory load">
      {reloadNotice && (
        <div className="memory__reload" role="alert">
          <p>
            Page reloaded after Device Camera handoff. Last load was{' '}
            <strong>{BALLAST_PRESETS[reloadNotice.loadLevel].label}</strong>
            {reloadNotice.heapUsedMB != null
              ? ` at ${reloadNotice.heapUsedMB} MB heap.`
              : '.'}{' '}
            This is the iTrac-style kill path.
          </p>
          <button type="button" className="button" onClick={dismissReloadNotice}>
            Dismiss
          </button>
        </div>
      )}

      <div className="memory__heading">
        <div>
          <h2>Memory load</h2>
          <p>
            Fake iTrac weight before opening the camera. Keep this applied, then use Device Camera.
          </p>
        </div>
        <button
          type="button"
          className="button"
          onClick={() => {
            void copyExperimentLog()
          }}
        >
          Copy log
        </button>
      </div>

      <div className="memory__levels" role="group" aria-label="Heap ballast">
        {LOAD_LEVELS.map((nextLevel) => (
          <button
            key={nextLevel}
            type="button"
            className={`memory__level${level === nextLevel ? ' memory__level--active' : ''}`}
            disabled={applying}
            onClick={() => setLevel(nextLevel)}
          >
            {BALLAST_PRESETS[nextLevel].label}
          </button>
        ))}
      </div>

      <p className="memory__status">
        {applying
          ? progress
          : level === 'off'
            ? 'Load is off. The page stays light.'
            : `Holding ${preset.buffersMB} MB buffers, ${stats?.photoCount ?? 0} JPEG data URLs${
                stats?.bitmapCount ? `, ${stats.bitmapCount} ImageBitmaps` : ''
              }, and ${formRows} form rows.`}
        {heap
          ? ` Heap ${heap.usedMB} / ${heap.limitMB} MB.`
          : ' Heap stats need Chrome.'}
      </p>

      {error && <p className="app__error" role="alert">{error}</p>}

      {formRows > 0 && (
        <details className="memory__form">
          <summary>Fake form ballast ({formRows} rows)</summary>
          <div className="memory__form-grid">
            {Array.from({ length: formRows }, (_, index) => (
              <label key={index} className="memory__field">
                Field {index + 1}
                <input defaultValue={`Checklist item ${index + 1}`} readOnly />
              </label>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
