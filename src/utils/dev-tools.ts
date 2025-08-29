import React from 'react'
import { RuntimeCoverageConfig } from '../types'
import RuntimeCoverageCollector from '../core/runtime-collector'

declare global {
  interface Window {
    __RUNTIME_COVERAGE_PANEL_ROOT__?: HTMLElement
    __RUNTIME_COVERAGE_PANEL_OPEN__?: boolean
  }
}

export function initializeRuntimeCoverage(config: Partial<RuntimeCoverageConfig> = {}) {
  if (typeof window === 'undefined') return null

  const defaultConfig: RuntimeCoverageConfig = {
    enabled: true,
    sampling: {
      enabled: process.env.NODE_ENV === 'production',
      sampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0, // 1% in prod, 100% in dev
      maxSamplesPerSecond: 1000,
      collectExecutionTime: false
    },
    excludePatterns: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
    includePatterns: ['**/*.{js,jsx,ts,tsx}'],
    sendToAnalytics: false,
    visualizationEnabled: process.env.NODE_ENV === 'development'
  }

  const finalConfig = { ...defaultConfig, ...config }
  
  if (!finalConfig.enabled) {
    return null
  }

  const collector = new RuntimeCoverageCollector(finalConfig)

  // Add keyboard shortcut to open panel (Ctrl+Shift+C)
  if (finalConfig.visualizationEnabled) {
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        event.preventDefault()
        toggleCoveragePanel()
      }
    })

    // Add development console helpers
    if (process.env.NODE_ENV === 'development') {
      console.log(`
🔧 Runtime Coverage initialized!

Keyboard shortcut: Ctrl+Shift+C to toggle coverage panel

Console commands:
- window.__RUNTIME_COVERAGE__.getBranchStats() - Get all branch statistics
- window.__RUNTIME_COVERAGE__.getExecutionSummary() - Get execution summary
- window.__RUNTIME_COVERAGE_DEV__.showSummary() - Show summary in console
- window.__RUNTIME_COVERAGE_DEV__.exportToFile() - Export data to JSON file

Analytics ${finalConfig.sendToAnalytics ? 'enabled' : 'disabled'}
Sampling ${finalConfig.sampling.enabled ? `enabled (${finalConfig.sampling.sampleRate * 100}%)` : 'disabled'}
      `)
    }
  }

  return collector
}

export async function openCoveragePanel(position: 'bottom' | 'right' | 'fullscreen' = 'bottom') {
  if (typeof window === 'undefined') return

  // Dynamic import to avoid bundling React in non-dev environments
  const { default: React } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { default: CoveragePanel } = await import('../components/CoveragePanel')

  if (window.__RUNTIME_COVERAGE_PANEL_OPEN__) {
    closeCoveragePanel()
    return
  }

  // Create panel container
  const panelContainer = document.createElement('div')
  panelContainer.id = 'runtime-coverage-panel-container'
  document.body.appendChild(panelContainer)

  const root = createRoot(panelContainer)
  window.__RUNTIME_COVERAGE_PANEL_ROOT__ = panelContainer
  window.__RUNTIME_COVERAGE_PANEL_OPEN__ = true

  const handleClose = () => {
    closeCoveragePanel()
  }

  root.render(
    React.createElement(CoveragePanel, {
      isOpen: true,
      onClose: handleClose,
      position
    })
  )
}

export function closeCoveragePanel() {
  if (window.__RUNTIME_COVERAGE_PANEL_ROOT__) {
    document.body.removeChild(window.__RUNTIME_COVERAGE_PANEL_ROOT__)
    window.__RUNTIME_COVERAGE_PANEL_ROOT__ = undefined
    window.__RUNTIME_COVERAGE_PANEL_OPEN__ = false
  }
}

export function toggleCoveragePanel(position: 'bottom' | 'right' | 'fullscreen' = 'bottom') {
  if (window.__RUNTIME_COVERAGE_PANEL_OPEN__) {
    closeCoveragePanel()
  } else {
    openCoveragePanel(position)
  }
}

// Add global dev tools
if (typeof window !== 'undefined') {
  ;(window as any).__RUNTIME_COVERAGE_DEV_TOOLS__ = {
    openPanel: openCoveragePanel,
    closePanel: closeCoveragePanel,
    togglePanel: toggleCoveragePanel,
    
    // Analysis helpers
    findDeadCode: () => {
      if (!window.__RUNTIME_COVERAGE__) return []
      const stats = window.__RUNTIME_COVERAGE__.getBranchStats()
      return Object.values(stats).filter(branch => 
        branch.hitCount === 0 && branch.missCount === 0
      )
    },
    
    findHotPaths: (threshold = 100) => {
      if (!window.__RUNTIME_COVERAGE__) return []
      const stats = window.__RUNTIME_COVERAGE__.getBranchStats()
      return Object.values(stats).filter(branch => {
        const total = branch.hitCount + branch.missCount
        return total > threshold && branch.hitCount / total > 0.8
      })
    },
    
    findColdPaths: (maxExecutions = 5) => {
      if (!window.__RUNTIME_COVERAGE__) return []
      const stats = window.__RUNTIME_COVERAGE__.getBranchStats()
      return Object.values(stats).filter(branch => {
        const total = branch.hitCount + branch.missCount
        return total > 0 && total <= maxExecutions
      })
    },
    
    generateReport: () => {
      if (!window.__RUNTIME_COVERAGE__) return null
      
      const stats = window.__RUNTIME_COVERAGE__.getBranchStats()
      const summary = window.__RUNTIME_COVERAGE__.getExecutionSummary()
      
      const report = {
        generatedAt: new Date().toISOString(),
        summary,
        recommendations: [],
        deadCodeFiles: new Set(),
        hotPathFiles: new Set()
      } as any

      // Analyze dead code
      Object.values(stats).forEach((branch: any) => {
        if (branch.hitCount === 0 && branch.missCount === 0) {
          report.deadCodeFiles.add(branch.file)
          report.recommendations.push({
            type: 'dead-code',
            file: branch.file,
            line: branch.line,
            condition: branch.condition,
            message: `Consider removing unused branch condition: ${branch.condition}`
          })
        }
      })

      // Analyze hot paths
      Object.values(stats).forEach((branch: any) => {
        const total = branch.hitCount + branch.missCount
        if (total > 100 && branch.hitCount / total > 0.9) {
          report.hotPathFiles.add(branch.file)
          report.recommendations.push({
            type: 'hot-path',
            file: branch.file,
            line: branch.line,
            condition: branch.condition,
            executionCount: total,
            message: `High-frequency branch - consider performance optimization: ${branch.condition}`
          })
        }
      })

      report.deadCodeFiles = Array.from(report.deadCodeFiles)
      report.hotPathFiles = Array.from(report.hotPathFiles)

      console.log('📊 Runtime Coverage Report:', report)
      return report
    }
  }
}