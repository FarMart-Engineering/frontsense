import { useState, useEffect, useCallback } from 'react'
import { BranchStats } from '../types'

interface RuntimeCoverageHook {
  branchStats: BranchStats
  summary: any
  isCollecting: boolean
  clearStats: () => void
  exportData: () => void
  refreshData: () => void
}

export function useRuntimeCoverage(autoRefresh = true, interval = 2000): RuntimeCoverageHook {
  const [branchStats, setBranchStats] = useState<BranchStats>({})
  const [summary, setSummary] = useState<any>(null)
  const [isCollecting, setIsCollecting] = useState(false)

  const refreshData = useCallback(() => {
    if (window.__RUNTIME_COVERAGE__) {
      const stats = window.__RUNTIME_COVERAGE__.getBranchStats()
      const executionSummary = window.__RUNTIME_COVERAGE__.getExecutionSummary()
      
      setBranchStats(stats)
      setSummary(executionSummary)
      setIsCollecting(Object.keys(stats).length > 0)
    } else {
      setIsCollecting(false)
    }
  }, [])

  const clearStats = useCallback(() => {
    if (window.__RUNTIME_COVERAGE__) {
      window.__RUNTIME_COVERAGE__.clearStats()
      setBranchStats({})
      setSummary(null)
      setIsCollecting(false)
    }
  }, [])

  const exportData = useCallback(() => {
    if (window.__RUNTIME_COVERAGE__) {
      const data = window.__RUNTIME_COVERAGE__.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `runtime-coverage-${new Date().toISOString()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [])

  useEffect(() => {
    refreshData()

    if (autoRefresh) {
      const intervalId = setInterval(refreshData, interval)
      return () => clearInterval(intervalId)
    }
  }, [refreshData, autoRefresh, interval])

  return {
    branchStats,
    summary,
    isCollecting,
    clearStats,
    exportData,
    refreshData
  }
}