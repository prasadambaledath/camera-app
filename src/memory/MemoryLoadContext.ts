import { createContext, useContext } from 'react'
import type { BallastStats, HeapSample, LoadLevel } from './ballast'
import type { CameraMode, ExperimentSnapshot } from './experiment'

export type MemoryLoadContextValue = {
  level: LoadLevel
  applying: boolean
  progress: string | null
  error: string | null
  stats: BallastStats | null
  formRows: number
  dataUrls: string[]
  heap: HeapSample | null
  reloadNotice: ExperimentSnapshot | null
  resizeEnabled: boolean
  setLevel: (level: LoadLevel) => void
  setResizeEnabled: (enabled: boolean) => void
  markHandoff: (mode: CameraMode) => void
  clearHandoff: () => void
  dismissReloadNotice: () => void
  copyExperimentLog: () => Promise<void>
}

export const MemoryLoadContext = createContext<MemoryLoadContextValue | null>(null)

export function useMemoryLoad() {
  const context = useContext(MemoryLoadContext)
  if (!context) {
    throw new Error('useMemoryLoad must be used within MemoryLoadProvider')
  }
  return context
}
