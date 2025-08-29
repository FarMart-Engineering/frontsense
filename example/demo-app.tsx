import React, { useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { initializeRuntimeCoverage, useRuntimeCoverage } from 'runtime-coverage-frontend'
import { openCoveragePanel } from 'runtime-coverage-frontend/utils/dev-tools'

// Initialize runtime coverage
initializeRuntimeCoverage({
  enabled: true,
  visualizationEnabled: true,
  sampling: {
    enabled: false, // Disable for demo
    sampleRate: 1.0,
    maxSamplesPerSecond: 1000,
    collectExecutionTime: true
  }
})

interface User {
  id: number
  name: string
  role: 'admin' | 'user' | 'guest'
  active: boolean
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
  
  const { branchStats, summary, isCollecting } = useRuntimeCoverage()

  // This demonstrates various branch conditions that will be instrumented
  const getFilteredUsers = () => {
    // Multiple if conditions - will show execution patterns
    if (filter === 'all') {
      return users
    }
    
    if (filter === 'active') {
      return users.filter(user => user.active)
    }
    
    if (filter === 'admin') {
      return users.filter(user => user.role === 'admin')
    }
    
    if (filter === 'inactive') {
      return users.filter(user => !user.active)
    }
    
    return users
  }

  const getUserBadgeColor = (user: User) => {
    // Switch statement - will track which cases are hit
    switch (user.role) {
      case 'admin':
        return '#dc3545'
      case 'user':
        return '#28a745'
      case 'guest':
        return '#ffc107'
      default:
        return '#6c757d'
    }
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
            onClick={() => openCoveragePanel('bottom')}
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
            onClick={() => setDarkMode(!darkMode)}
            style={{ 
              padding: '8px 16px',
              backgroundColor: darkMode ? '#ffc107' : '#6c757d',
              color: darkMode ? '#000' : '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {darkMode ? '☀️' : '🌙'}
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
          ⌨️ Press <strong>Ctrl+Shift+C</strong> to toggle coverage panel
        </p>
        {summary && (
          <div style={{ fontSize: '14px' }}>
            Coverage rate: {(summary.coverageRate * 100).toFixed(1)}% | 
            Dead branches: {summary.deadBranches} | 
            Total executions: {summary.hitBranches}
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
            onChange={(e) => setShowAdvanced(e.target.checked)}
            style={{ marginRight: '5px' }}
          />
          Show Advanced Options
        </label>
      </div>

      {/* Advanced Options - Conditional rendering */}
      {showAdvanced && (
        <div style={{ 
          padding: '15px', 
          backgroundColor: darkMode ? '#4a5568' : '#e9ecef', 
          borderRadius: '8px', 
          marginBottom: '20px' 
        }}>
          <h4>Advanced Options</h4>
          <p>This panel demonstrates conditional rendering that will be tracked by the coverage tool.</p>
          <button 
            onClick={() => setShowAdvanced(false)}
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
                {user.active ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            
            <div>
              {/* Logical AND in JSX - will be tracked */}
              {user.role === 'admin' && (
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
                  backgroundColor: user.active ? '#ffc107' : '#28a745',
                  color: user.active ? '#000' : '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {user.active ? 'Deactivate' : 'Activate'}
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
          <li>Change the filter dropdown to see different conditional branches</li>
          <li>Toggle dark mode to execute theme-related conditionals</li>
          <li>Show/hide advanced options to track conditional rendering</li>
          <li>Activate/deactivate users to see dynamic condition execution</li>
          <li>Open the coverage panel to see real-time analysis</li>
        </ul>
        
        <p><strong>Keyboard Shortcuts:</strong></p>
        <ul>
          <li><code>Ctrl+Shift+C</code> - Toggle coverage panel</li>
        </ul>
        
        <p><strong>Console Commands:</strong></p>
        <ul>
          <li><code>window.__RUNTIME_COVERAGE_DEV_TOOLS__.findDeadCode()</code></li>
          <li><code>window.__RUNTIME_COVERAGE_DEV_TOOLS__.findHotPaths()</code></li>
          <li><code>window.__RUNTIME_COVERAGE_DEV_TOOLS__.generateReport()</code></li>
        </ul>
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