import { BALLAST_PRESETS, readHeap, type LoadLevel } from './ballast'

export type CameraMode = 'device' | 'in-app'

export type ExperimentSnapshot = {
  loadLevel: LoadLevel
  mode: CameraMode
  resizeEnabled: boolean
  heapUsedMB: number | null
  heapLimitMB: number | null
  startedAt: number
  pendingHandoff: boolean
  userAgent: string
}

const STORAGE_KEY = 'camera-app:experiment'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
}

export function readExperiment(): ExperimentSnapshot | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as ExperimentSnapshot
  } catch {
    return null
  }
}

export function writeExperiment(snapshot: ExperimentSnapshot): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
}

export function markHandoff(
  loadLevel: LoadLevel,
  mode: CameraMode,
  resizeEnabled: boolean,
): ExperimentSnapshot {
  const heap = readHeap()
  const snapshot: ExperimentSnapshot = {
    loadLevel,
    mode,
    resizeEnabled,
    heapUsedMB: heap?.usedMB ?? null,
    heapLimitMB: heap?.limitMB ?? null,
    startedAt: Date.now(),
    pendingHandoff: mode === 'device',
    userAgent: navigator.userAgent,
  }
  writeExperiment(snapshot)
  console.info('[camera-app] experiment', formatExperimentLog(snapshot, false))
  return snapshot
}

export function clearPendingHandoff(): void {
  const current = readExperiment()
  if (!current?.pendingHandoff) return
  writeExperiment({ ...current, pendingHandoff: false })
}

export function wasReloadedAfterHandoff(): ExperimentSnapshot | null {
  const snapshot = readExperiment()
  if (!snapshot?.pendingHandoff) return null

  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  if (navigation?.type !== 'reload') return null

  writeExperiment({ ...snapshot, pendingHandoff: false })
  return snapshot
}

export function formatExperimentLog(
  snapshot: Pick<
    ExperimentSnapshot,
    'loadLevel' | 'mode' | 'resizeEnabled' | 'heapUsedMB' | 'heapLimitMB' | 'userAgent'
  > & {
    reload?: boolean
  },
  includeReload: boolean,
): string {
  const preset = BALLAST_PRESETS[snapshot.loadLevel]
  const heap = readHeap()
  const lines = [
    `device: ${snapshot.userAgent}`,
    `chrome-memory: ${heap ? `${heap.usedMB} / ${heap.limitMB} MB` : 'unavailable'}`,
    `mode: ${snapshot.mode === 'device' ? 'Device Camera' : 'In-App Camera'}`,
    `load: ${preset.label} (${preset.photoCount} JPEG data URLs in state, ${preset.formRows} form rows)`,
    `itrac-resize: ${snapshot.resizeEnabled ? 'Y' : 'N'}`,
    `heap-at-start: ${snapshot.heapUsedMB ?? 'n/a'} MB / ${snapshot.heapLimitMB ?? 'n/a'} MB`,
    `pwa-installed: ${isStandalone() ? 'Y' : 'N'}`,
  ]

  if (includeReload) {
    lines.push(`reload: ${snapshot.reload ? 'Y' : 'N'}`)
  }

  return lines.join('\n')
}
