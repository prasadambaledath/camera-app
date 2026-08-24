import { BALLAST_PRESETS, dataUrlHeapMB, LOAD_LEVELS } from '../memory/ballast'
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
    dataUrls,
    heap,
    reloadNotice,
    setLevel,
    dismissReloadNotice,
    copyExperimentLog,
  } = useMemoryLoad()

  const jpegMB = stats ? Math.round((stats.jpegBytes / (1024 * 1024)) * 10) / 10 : 0
  const stringHeapMB = stats ? dataUrlHeapMB(stats.dataUrlChars) : 0

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
            iTrac resize was {reloadNotice.resizeEnabled ? 'on' : 'off'}.
            This is the iTrac-style kill path.
          </p>
          <button type="button" className="button" onClick={dismissReloadNotice}>
            Dismiss
          </button>
        </div>
      )}

      <div className="memory__heading">
        <h4>Fake memory load</h4>
        <button
          type="button"
          onClick={() => {
            void copyExperimentLog()
          }}
        >
          Copy log
        </button>
      </div>

      <div className="memory__levels" role="group" aria-label="In-memory photos">
        {LOAD_LEVELS.map((nextLevel) => (
          <button
            key={nextLevel}
            type="button"
            className={`memory__level${level === nextLevel ? ' memory__level--active' : ''}`}
            disabled={applying}
            onClick={() => setLevel(nextLevel)}
          >
            {BALLAST_PRESETS[nextLevel].label}
            {nextLevel !== 'off' && (
              <span className="memory__level-meta">{BALLAST_PRESETS[nextLevel].photoCount} photos</span>
            )}
          </button>
        ))}
      </div>

      <p className="memory__status">
        {applying
          ? progress
          : level === 'off'
            ? 'Load is off. No extra photos in memory.'
            : `Holding ${stats?.photoCount ?? 0} JPEG data URLs (~${jpegMB} MB binary, ~${stringHeapMB} MB as JS strings) and ${formRows} checklist fields.`}
        {heap
          ? ` Heap ${heap.usedMB} / ${heap.limitMB} MB.`
          : ' Heap stats need Chrome.'}
      </p>

      {error && <p className="app__error" role="alert">{error}</p>}

      {dataUrls.length > 0 && (
        <details className="memory__form">
          <summary>In-memory UDF photos ({dataUrls.length} in React state)</summary>
          <ul className="memory__thumbs">
            {dataUrls.map((url, index) => (
              <li key={`${index}-${url.slice(-24)}`}>
                <img src={url} alt={`Ballast photo ${index + 1}`} />
              </li>
            ))}
          </ul>
        </details>
      )}

      {formRows > 0 && (
        <details className="memory__form">
          <summary>Fake checklist form ({formRows} fields)</summary>
          <p className="memory__form-note">
            Decent dropdowns/inputs like Test Checklist / UDF — not what usually kills Chrome.
          </p>
          <div className="memory__form-grid">
            {Array.from({ length: formRows }, (_, index) => (
              <label key={index} className="memory__field">
                UDF field {index + 1}
                <input defaultValue={`Checklist item ${index + 1}`} readOnly />
              </label>
            ))}
          </div>
        </details>
      )}
    </section>
  )
}
