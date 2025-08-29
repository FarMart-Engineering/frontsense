import React, { useState, useEffect } from 'react'
import BranchHeatmap from './BranchHeatmap'
import ExecutionTree from './ExecutionTree'
import { BranchStats } from '../types'

declare global {
  interface Window {
    __RUNTIME_COVERAGE__?: {
      getBranchStats(): BranchStats
      getExecutionSummary(): any
      clearStats(): void
      exportData(): any
    }
  }
}

interface CoveragePanelProps {
  isOpen: boolean
  onClose: () => void
  position?: 'bottom' | 'right' | 'fullscreen'
}

export const CoveragePanel: React.FC<CoveragePanelProps> = ({
  isOpen,
  onClose,
  position = 'bottom'
}) => {
  const [branchStats, setBranchStats] = useState<BranchStats>({})
  const [selectedFile, setSelectedFile] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState<'heatmap' | 'tree' | 'summary'>('summary')
  const [summary, setSummary] = useState<any>(null)

  // Auto-refresh data
  useEffect(() => {
    if (!isOpen) return

    const updateData = () => {
      if (window.__RUNTIME_COVERAGE__) {
        setBranchStats(window.__RUNTIME_COVERAGE__.getBranchStats())
        setSummary(window.__RUNTIME_COVERAGE__.getExecutionSummary())
      }
    }

    updateData()
    const interval = setInterval(updateData, 2000) // Update every 2 seconds

    return () => clearInterval(interval)
  }, [isOpen])

  const files = Object.values(branchStats).reduce((acc, branch) => {
    if (!acc.includes(branch.file)) {
      acc.push(branch.file)
    }
    return acc
  }, [] as string[])

  const handleBranchClick = (branchId: string) => {
    const branch = branchStats[branchId]
    if (branch) {
      console.log('Selected branch:', branch)
      // Could implement code navigation here
    }
  }

  const handleExportData = () => {
    if (window.__RUNTIME_COVERAGE__) {
      const data = window.__RUNTIME_COVERAGE__.exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `runtime-coverage-${new Date().toISOString()}.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleClearStats = () => {
    if (window.__RUNTIME_COVERAGE__) {
      window.__RUNTIME_COVERAGE__.clearStats()
      setBranchStats({})
      setSummary(null)
    }
  }

  if (!isOpen) return null

  const panelStyles: React.CSSProperties = {
    position: 'fixed',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: position === 'fullscreen' ? '0' : '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: 10000,
    display: 'flex',
    flexDirection: 'column',
    ...(position === 'bottom' && {
      bottom: '0',
      left: '20px',
      right: '20px',
      height: '60vh',
      maxHeight: '600px'
    }),
    ...(position === 'right' && {
      right: '0',
      top: '20px',
      bottom: '20px',
      width: '50vw',
      maxWidth: '800px'
    }),
    ...(position === 'fullscreen' && {
      top: '0',
      left: '0',
      right: '0',
      bottom: '0'
    })
  }

  return (
    <div style={panelStyles}>
      {/* Header */}
      <div style={{ 
        padding: '12px 16px', 
        borderBottom: '1px solid #eee',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <h3 style={{ margin: 0, color: '#333' }}>🔧 Runtime Coverage Analysis</h3>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleExportData}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Export
          </button>
          <button
            onClick={handleClearStats}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            Clear
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              fontSize: '14px',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #eee',
        backgroundColor: '#f8f9fa'
      }}>
        {[
          { id: 'summary', label: '📊 Summary' },
          { id: 'heatmap', label: '🗺️ Heatmap' },
          { id: 'tree', label: '🌳 Execution Tree' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '8px 16px',
              border: 'none',
              backgroundColor: activeTab === tab.id ? 'white' : 'transparent',
              borderBottom: activeTab === tab.id ? '2px solid #007bff' : '2px solid transparent',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* File Filter */}
      {files.length > 1 && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee', backgroundColor: '#f8f9fa' }}>
          <select
            value={selectedFile || ''}
            onChange={(e) => setSelectedFile(e.target.value || undefined)}
            style={{
              padding: '4px 8px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '12px',
              minWidth: '200px'
            }}
          >
            <option value="">All files ({files.length})</option>
            {files.map(file => (
              <option key={file} value={file}>
                {file.split('/').pop()} ({Object.values(branchStats).filter(b => b.file === file).length})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        {activeTab === 'summary' && (
          <div>
            {summary ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                  <div style={{ padding: '16px', backgroundColor: '#e3f2fd', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>Total Branches</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.totalBranches}</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#e8f5e8', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#388e3c' }}>Coverage Rate</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(summary.coverageRate * 100).toFixed(1)}%</div>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: '#ffebee', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 8px 0', color: '#d32f2f' }}>Dead Code</h4>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{summary.deadBranches}</div>
                  </div>
                </div>

                {summary.topDeadCodeFiles && summary.topDeadCodeFiles.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4>🔍 Files with Most Dead Code</h4>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '4px' }}>
                      {summary.topDeadCodeFiles.slice(0, 5).map((file: any, index: number) => (
                        <div key={file.file} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 0',
                          borderBottom: index < 4 ? '1px solid #eee' : 'none'
                        }}>
                          <span style={{ fontSize: '12px' }}>{file.file.split('/').pop()}</span>
                          <span style={{ fontSize: '12px', color: '#d32f2f' }}>
                            {file.deadBranches}/{file.totalBranches} branches
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary.topHotPathFiles && summary.topHotPathFiles.length > 0 && (
                  <div>
                    <h4>🔥 Files with Hot Execution Paths</h4>
                    <div style={{ backgroundColor: '#f8f9fa', padding: '12px', borderRadius: '4px' }}>
                      {summary.topHotPathFiles.slice(0, 5).map((file: any, index: number) => (
                        <div key={file.file} style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          padding: '4px 0',
                          borderBottom: index < 4 ? '1px solid #eee' : 'none'
                        }}>
                          <span style={{ fontSize: '12px' }}>{file.file.split('/').pop()}</span>
                          <span style={{ fontSize: '12px', color: '#388e3c' }}>
                            {file.hotBranches} hot paths
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                No data collected yet. Start interacting with your application to see branch coverage.
              </div>
            )}
          </div>
        )}

        {activeTab === 'heatmap' && Object.keys(branchStats).length > 0 && (
          <BranchHeatmap
            branchStats={branchStats}
            selectedFile={selectedFile}
            onBranchClick={handleBranchClick}
            width={Math.min(800, window.innerWidth - 100)}
            height={400}
          />
        )}

        {activeTab === 'tree' && Object.keys(branchStats).length > 0 && (
          <ExecutionTree
            branchStats={branchStats}
            selectedFile={selectedFile}
            onNodeSelect={handleBranchClick}
            width={Math.min(800, window.innerWidth - 100)}
            height={400}
          />
        )}

        {activeTab !== 'summary' && Object.keys(branchStats).length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            No branch data available. Make sure the runtime coverage collector is running.
          </div>
        )}
      </div>
    </div>
  )
}

export default CoveragePanel