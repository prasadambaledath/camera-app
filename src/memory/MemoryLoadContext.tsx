import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  applyBallast,
  BALLAST_PRESETS,
  readHeap,
  releaseBallast,
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

type MemoryLoadContextValue = {
  level: LoadLevel
  applying: boolean
  progress: string | null
  error: string | null
  stats: BallastStats | null
  formRows: number
  heap: HeapSample | null
  reloadNotice: ExperimentSnapshot | null
  setLevel: (level: LoadLevel) => void
  markHandoff: (mode: CameraMode) => void
  clearHandoff: () => void
  dismissReloadNotice: () => void
  copyExperimentLog: () => Promise<void>
}

const MemoryLoadContext = createContext<MemoryLoadContextValue | null>(null)

export function MemoryLoadProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState<LoadLevel>('off')
  const [applying, setApplying] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<BallastStats | null>(null)
  const [heap, setHeap] = useState<HeapSample | null>(() => readHeap())
  const [reloadNotice, setReloadNotice] = useState<ExperimentSnapshot | null>(null)

  useEffect(() => {
    setReloadNotice(wasReloadedAfterHandoff())
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setHeap(readHeap())
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    return () => {
      releaseBallast()
    }
  }, [])

  const setLevel = useCallback(async (nextLevel: LoadLevel) => {
    setApplying(true)
    setError(null)
    setProgress(nextLevel === 'off' ? 'Releasing memory load…' : `Applying ${BALLAST_PRESETS[nextLevel].label}…`)

    try {
      const nextStats = await applyBallast(nextLevel, setProgress)
      setLevelState(nextLevel)
      setStats(nextStats)
      setHeap(readHeap())
      setProgress(null)
    } catch (err) {
      releaseBallast()
      setLevelState('off')
      setStats({ buffersMB: 0, photoCount: 0, bitmapCount: 0, formRows: 0 })
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
    persistHandoff(level, mode)
  }, [level])

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
  }, [level, reloadNotice])

  const value = useMemo<MemoryLoadContextValue>(() => ({
    level,
    applying,
    progress,
    error,
    stats,
    formRows: stats?.formRows ?? 0,
    heap,
    reloadNotice,
    setLevel: (nextLevel) => {
      void setLevel(nextLevel)
    },
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
    setLevel,
    stats,
  ])

  return (
    <MemoryLoadContext.Provider value={value}>
      {children}
    </MemoryLoadContext.Provider>
  )
}

export function useMemoryLoad() {
  const context = useContext(MemoryLoadContext)
  if (!context) {
    throw new Error('useMemoryLoad must be used within MemoryLoadProvider')
  }
  return context
}
