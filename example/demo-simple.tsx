import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

// Simple inline initialization for demo
if (typeof window !== 'undefined') {
  ;(window as any).__RUNTIME_COVERAGE_CONFIG__ = {
    enabled: true,
    sampling: {
      enabled: false,
      sampleRate: 1.0,
      collectExecutionTime: true
    }
  }

  // Simple runtime collector for demo
  class SimpleRuntimeCollector {
    private branchStats: any = {}
    private sessionId: string

    constructor() {
      this.sessionId = `demo_${Date.now()}`
      this.initializeGlobalInterface()
    }

    initializeGlobalInterface() {
      ;(window as any).__RUNTIME_COVERAGE__ = {
        recordBranchHit: this.recordBranchHit.bind(this),
        getBranchStats: () => ({ ...this.branchStats }),
        getExecutionSummary: this.getExecutionSummary.bind(this),
        clearStats: () => { this.branchStats = {} },
        exportData: () => ({
          branchStats: this.branchStats,
          executionSummary: this.getExecutionSummary(),
          sessionId: this.sessionId
        })
      }
    }

    recordBranchHit(branchId: string, type: string, conditionCode: string, conditionResult: boolean) {
      const now = performance.now()
      const [filePath, line, column] = branchId.split(':')

      if (!this.branchStats[branchId]) {
        this.branchStats[branchId] = {
          branchId,
          file: filePath,
          line: parseInt(line, 10),
          column: parseInt(column, 10),
          type: type,
          condition: conditionCode,
          hitCount: 0,
          missCount: 0,
          timestamp: now
        }
      }

      const branch = this.branchStats[branchId]
      
      if (conditionResult) {
        branch.hitCount++
      } else {
        branch.missCount++
      }
      
      branch.timestamp = now
      return conditionResult
    }

    getExecutionSummary() {
      const stats = Object.values(this.branchStats) as any[]
      const totalBranches = stats.length
      const hitBranches = stats.filter(b => b.hitCount > 0).length
      const deadBranches = stats.filter(b => b.hitCount === 0).length
      
      return {
        totalBranches,
        hitBranches,
        deadBranches,
        coverageRate: totalBranches > 0 ? hitBranches / totalBranches : 0,
        sessionId: this.sessionId
      }
    }
  }

  new SimpleRuntimeCollector()
}

interface User {
  id: number
  name: string
  role: 'admin' | 'user' | 'guest'
  active: boolean
}

// Simple hook replacement
function useRuntimeCoverage() {
  const [branchStats, setBranchStats] = useState<any>({})
  const [summary, setSummary] = useState<any>(null)
  const [isCollecting, setIsCollecting] = useState(false)

  const refreshData = () => {
    if ((window as any).__RUNTIME_COVERAGE__) {
      const stats = (window as any).__RUNTIME_COVERAGE__.getBranchStats()
      const executionSummary = (window as any).__RUNTIME_COVERAGE__.getExecutionSummary()
      
      setBranchStats(stats)
      setSummary(executionSummary)
      setIsCollecting(Object.keys(stats).length > 0)
    }
  }

  useEffect(() => {
    refreshData()
    const interval = setInterval(refreshData, 2000)
    return () => clearInterval(interval)
  }, [])

  return {
    branchStats,
    summary,
    isCollecting,
    clearStats: () => (window as any).__RUNTIME_COVERAGE__?.clearStats(),
    exportData: () => {
      const data = (window as any).__RUNTIME_COVERAGE__?.exportData()
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `runtime-coverage-demo-${new Date().toISOString()}.json`
        a.click()
      }
    }
  }
}

const DemoApp: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    { id: 1, name: 'Alice', role: 'admin', active: true },
    { id: 2, name: 'Bob', role: 'user', active: true },
    { id: 3, name: 'Charlie', role: 'guest', active: false },
    { id: 4, name: 'David', role: 'admin', active: false }
  ])
  
  const [filter, setFilter] = useState<'all' | 'active' | 'admin' | 'inactive'>('all')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  
  const { branchStats, summary, isCollecting, clearStats, exportData } = useRuntimeCoverage()

  // Instrumented functions (manual instrumentation for demo)
  const getFilteredUsers = () => {
    // Simulate branch tracking
    const recordHit = (window as any).__RUNTIME_COVERAGE__?.recordBranchHit

    if (recordHit?.('demo-app.tsx:120:8:if#1', 'if', 'filter === "all"', filter === 'all') && filter === 'all') {
      return users
    }
    
    if (recordHit?.('demo-app.tsx:124:8:if#2', 'if', 'filter === "active"', filter === 'active') && filter === 'active') {
      return users.filter(user => {
        return recordHit('demo-app.tsx:125:25:arrow#1', 'logical', 'user.active', user.active) && user.active
      })
    }
    
    if (recordHit?.('demo-app.tsx:129:8:if#3', 'if', 'filter === "admin"', filter === 'admin') && filter === 'admin') {
      return users.filter(user => {
        return recordHit('demo-app.tsx:130:25:arrow#2', 'logical', 'user.role === "admin"', user.role === 'admin') && user.role === 'admin'
      })
    }
    
    if (recordHit?.('demo-app.tsx:134:8:if#4', 'if', 'filter === "inactive"', filter === 'inactive') && filter === 'inactive') {
      return users.filter(user => {
        return recordHit('demo-app.tsx:135:25:arrow#3', 'logical', '!user.active', !user.active) && !user.active
      })
    }
    
    return users
  }

  const getUserBadgeColor = (user: User) => {
    const recordHit = (window as any).__RUNTIME_COVERAGE__?.recordBranchHit
    
    // Simulate switch tracking
    if (recordHit?.('demo-app.tsx:145:15:switch#1', 'switch', 'user.role === "admin"', user.role === 'admin') && user.role === 'admin') {
      return '#dc3545'
    }
    if (recordHit?.('demo-app.tsx:147:15:switch#2', 'switch', 'user.role === "user"', user.role === 'user') && user.role === 'user') {
      return '#28a745'
    }
    if (recordHit?.('demo-app.tsx:149:15:switch#3', 'switch', 'user.role === "guest"', user.role === 'guest') && user.role === 'guest') {
      return '#ffc107'
    }
    return '#6c757d'
  }

  const toggleUserStatus = (userId: number) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, active: !user.active } : user
    ))
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      backgroundColor: darkMode ? '#2d3748' : '#ffffff',
      color: darkMode ? '#ffffff' : '#000000',
      minHeight: '100vh'
    }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>🔧 Runtime Coverage Demo</h1>
        <div>
          <button 
            onClick={() => alert('Coverage panel would open here!\n\nIn the full version, this opens an interactive panel with heatmaps and execution trees.')}
            style={{ 
              marginRight: '10px',
              padding: '8px 16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Open Coverage Panel
          </button>
          <button 
            onClick={() => {
              const recordHit = (window as any).__RUNTIME_COVERAGE__?.recordBranchHit
              recordHit?.('demo-app.tsx:185:35:ternary#1', 'ternary', '!darkMode', !darkMode)
              setDarkMode(!darkMode)
            }}
            style={{ 
              padding: '8px 16px',
              backgroundColor: darkMode ? '#ffc107' : '#6c757d',
              color: darkMode ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:198:14:ternary#2', 'ternary', 'darkMode', darkMode) && darkMode) ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* Coverage Stats */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: darkMode ? '#4a5568' : '#f8f9fa', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Real-time Coverage Stats</h3>
        <p>
          📊 Branches tracked: {Object.keys(branchStats).length} | 
          🎯 Is collecting: {isCollecting ? 'Yes' : 'No'} |
          💡 Interact with the UI to see branches being tracked!
        </p>
        {summary && (
          <div style={{ fontSize: '14px', marginTop: '10px' }}>
            Coverage rate: {(summary.coverageRate * 100).toFixed(1)}% | 
            Dead branches: {summary.deadBranches} | 
            Hit branches: {summary.hitBranches}
            <div style={{ marginTop: '10px' }}>
              <button onClick={clearStats} style={{ marginRight: '10px', padding: '4px 8px', fontSize: '12px' }}>
                Clear Stats
              </button>
              <button onClick={exportData} style={{ padding: '4px 8px', fontSize: '12px' }}>
                Export Data
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px' }}>Filter users:</label>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          style={{ 
            padding: '5px', 
            marginRight: '15px',
            backgroundColor: darkMode ? '#4a5568' : '#ffffff',
            color: darkMode ? '#ffffff' : '#000000',
            border: `1px solid ${darkMode ? '#718096' : '#ced4da'}`
          }}
        >
          <option value="all">All Users</option>
          <option value="active">Active Only</option>
          <option value="admin">Admins Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        
        <label style={{ marginRight: '10px' }}>
          <input 
            type="checkbox" 
            checked={showAdvanced}
            onChange={(e) => {
              const recordHit = (window as any).__RUNTIME_COVERAGE__?.recordBranchHit
              recordHit?.('demo-app.tsx:255:26:ternary#3', 'ternary', 'e.target.checked', e.target.checked)
              setShowAdvanced(e.target.checked)
            }}
            style={{ marginRight: '5px' }}
          />
          Show Advanced Options
        </label>
      </div>

      {/* Advanced Options - Conditional rendering */}
      {((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:268:8:jsx-conditional#1', 'jsx-conditional', 'showAdvanced', showAdvanced) && showAdvanced) && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: darkMode ? '#4a5568' : '#e9ecef', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h4>Advanced Options</h4>
          <p>This panel demonstrates conditional rendering that is being tracked by the coverage tool.</p>
          <button 
            onClick={() => {
              const recordHit = (window as any).__RUNTIME_COVERAGE__?.recordBranchHit
              recordHit?.('demo-app.tsx:280:26:literal#1', 'literal', 'setShowAdvanced(false)', true)
              setShowAdvanced(false)
            }}
            style={{ 
              padding: '5px 10px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Hide Advanced Options
          </button>
        </div>
      )}

      {/* User List */}
      <div>
        <h3>Users ({getFilteredUsers().length})</h3>
        {getFilteredUsers().map(user => (
          <div 
            key={user.id}
            style={{ 
              padding: '15px',
              margin: '10px 0',
              backgroundColor: darkMode ? '#4a5568' : '#ffffff',
              border: `1px solid ${darkMode ? '#718096' : '#dee2e6'}`,
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <div>
              <strong>{user.name}</strong>
              <span 
                style={{ 
                  marginLeft: '10px',
                  padding: '2px 8px',
                  backgroundColor: getUserBadgeColor(user),
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '12px'
                }}
              >
                {user.role}
              </span>
              {/* Ternary operator in JSX - will be tracked */}
              <span style={{ marginLeft: '10px' }}>
                {((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:325:18:ternary#4', 'ternary', 'user.active', user.active) && user.active) ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            
            <div>
              {/* Logical AND in JSX - will be tracked */}
              {((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:331:16:jsx-conditional#2', 'jsx-conditional', 'user.role === "admin"', user.role === 'admin') && user.role === 'admin') && (
                <span style={{ 
                  marginRight: '10px', 
                  color: '#dc3545', 
                  fontSize: '12px' 
                }}>
                  👑 Admin
                </span>
              )}
              
              <button
                onClick={() => toggleUserStatus(user.id)}
                style={{
                  padding: '5px 10px',
                  backgroundColor: ((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:346:35:ternary#5', 'ternary', 'user.active', user.active) && user.active) ? '#ffc107' : '#28a745',
                  color: ((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:347:25:ternary#6', 'ternary', 'user.active', user.active) && user.active) ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {((window as any).__RUNTIME_COVERAGE__?.recordBranchHit?.('demo-app.tsx:354:18:ternary#7', 'ternary', 'user.active', user.active) && user.active) ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div style={{ 
        marginTop: '30px', 
        padding: '20px', 
        backgroundColor: darkMode ? '#4a5568' : '#d1ecf1', 
        borderRadius: '8px' 
      }}>
        <h4>🎯 Try These Actions to Generate Branch Coverage Data:</h4>
        <ul>
          <li>Change the filter dropdown to see different conditional branches being executed</li>
          <li>Toggle dark mode to execute theme-related conditionals</li>
          <li>Show/hide advanced options to track conditional rendering</li>
          <li>Activate/deactivate users to see dynamic condition execution</li>
          <li>Watch the coverage stats update in real-time!</li>
        </ul>
        
        <p><strong>Coverage Data Available:</strong></p>
        <ul>
          <li>Branch execution frequency</li>
          <li>Dead code detection (unused branches)</li>
          <li>Hot path identification</li>
          <li>Export functionality for analysis</li>
        </ul>

        <div style={{ 
          marginTop: '15px', 
          padding: '10px', 
          backgroundColor: 'rgba(0,0,0,0.1)', 
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Console Commands:</strong><br/>
          • <code>window.__RUNTIME_COVERAGE__.getBranchStats()</code><br/>
          • <code>window.__RUNTIME_COVERAGE__.getExecutionSummary()</code>
        </div>
      </div>
    </div>
  )
}

// Render the demo app
const container = document.getElementById('root')
if (container) {
  const root = createRoot(container)
  root.render(<DemoApp />)
}