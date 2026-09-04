import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyBallast,
  BALLAST_PRESETS,
  readHeap,
  type BallastStats,
  type HeapSample,
  type LoadLevel,
} from './ballast'
import {
  clearPendingHandoff,
  formatExperimentLog,
  markHandoff as persistHandoff,
  wasReloadedAfterHandoff,
  type CameraMode,
  type ExperimentSnapshot,
} from './experiment'
import { MemoryLoadContext, type MemoryLoadContextValue } from './MemoryLoadContext'

export function MemoryLoadProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<LoadLevel>('off')
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<BallastStats | null>(null)
  const [heap, setHeap] = useState<HeapSample | null>(() => readHeap())
  const [reloadNotice, setReloadNotice] = useState<ExperimentSnapshot | null>(() => wasReloadedAfterHandoff())
  const [resizeEnabled, setResizeEnabled] = useState(false)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeap(readHeap())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const setLevel = useCallback(async (nextLevel: LoadLevel) => {
    setApplying(true)
    setError(null)
    setStats({ photoCount: 0, formRows: 0, jpegBytes: 0, dataUrlChars: 0, dataUrls: [] })
    setProgress(nextLevel === 'off' ? 'Released in-memory photos' : `Applying ${BALLAST_PRESETS[nextLevel].label}…`)

    try {
      const nextStats = await applyBallast(nextLevel, setProgress)
      setLevelState(nextLevel)
      setStats(nextStats)
      setHeap(readHeap())
      setProgress(null)
    } catch (err) {
      setLevelState('off')
      setStats({ photoCount: 0, formRows: 0, jpegBytes: 0, dataUrlChars: 0, dataUrls: [] })
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to allocate memory load. The browser may already be under pressure.',
      )
      setProgress(null)
    } finally {
      setApplying(false)
    }
  }, [])

  const markHandoff = useCallback((mode: CameraMode) => {
    persistHandoff(level, mode, resizeEnabled)
  }, [level, resizeEnabled])

  const clearHandoff = useCallback(() => {
    clearPendingHandoff()
  }, [])

  const dismissReloadNotice = useCallback(() => {
    setReloadNotice(null)
  }, [])

  const copyExperimentLog = useCallback(async () => {
    const heapNow = readHeap()
    const text = formatExperimentLog(
      {
        loadLevel: level,
        mode: reloadNotice?.mode ?? 'device',
        resizeEnabled: reloadNotice?.resizeEnabled ?? resizeEnabled,
        heapUsedMB: heapNow?.usedMB ?? null,
        heapLimitMB: heapNow?.limitMB ?? null,
        userAgent: navigator.userAgent,
        reload: Boolean(reloadNotice),
      },
      true,
    )
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      console.info('[camera-app] experiment log\n', text)
    }
  }, [level, reloadNotice, resizeEnabled])

  const value = useMemo<MemoryLoadContextValue>(() => ({
    level,
    applying,
    progress,
    error,
    stats,
    formRows: stats?.formRows ?? 0,
    dataUrls: stats?.dataUrls ?? [],
    heap,
    reloadNotice,
    resizeEnabled,
    setLevel: (nextLevel) => {
      void setLevel(nextLevel)
    },
    setResizeEnabled,
    markHandoff,
    clearHandoff,
    dismissReloadNotice,
    copyExperimentLog,
  }), [
    applying,
    clearHandoff,
    copyExperimentLog,
    dismissReloadNotice,
    error,
    heap,
    level,
    markHandoff,
    progress,
    reloadNotice,
    resizeEnabled,
    setLevel,
    stats,
  ])

  return (
    <MemoryLoadContext.Provider value={value}>
      {children}
    </MemoryLoadContext.Provider>
  )
}
