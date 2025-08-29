import { BranchHit, BranchStats, SamplingConfig, AnalyticsEvent, RuntimeCoverageConfig } from '../types'

class RuntimeCoverageCollector {
  private branchStats: BranchStats = {}
  private samplingConfig: SamplingConfig
  private config: RuntimeCoverageConfig
  private sampleCounter = 0
  private lastSampleTime = 0
  private sessionId: string
  
  constructor(config: RuntimeCoverageConfig) {
    this.config = config
    this.samplingConfig = config.sampling
    this.sessionId = this.generateSessionId()
    
    // Initialize global interface
    this.initializeGlobalInterface()
    
    // Set up periodic analytics sending
    if (config.sendToAnalytics && config.analyticsEndpoint) {
      this.startAnalyticsReporting()
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeGlobalInterface() {
    ;(window as any).__RUNTIME_COVERAGE__ = {
      recordBranchHit: this.recordBranchHit.bind(this),
      getBranchStats: this.getBranchStats.bind(this),
      getExecutionSummary: this.getExecutionSummary.bind(this),
      clearStats: this.clearStats.bind(this),
      updateConfig: this.updateConfig.bind(this)
    }
  }

  recordBranchHit(
    branchId: string, 
    type: string, 
    conditionCode: string, 
    conditionResult: boolean,
    collectExecutionTime: boolean = false
  ): boolean {
    // Apply sampling if enabled
    if (this.samplingConfig.enabled && !this.shouldSample()) {
      return conditionResult
    }

    const now = performance.now()
    
    // Rate limiting
    if (this.samplingConfig.enabled && this.isRateLimited(now)) {
      return conditionResult
    }

    // Extract file info from branchId
    const [filePath, line, column, branchType] = branchId.split(':')
    const lineNum = parseInt(line, 10)
    const colNum = parseInt(column, 10)

    if (!this.branchStats[branchId]) {
      this.branchStats[branchId] = {
        branchId,
        file: filePath,
        line: lineNum,
        column: colNum,
        type: type as any,
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
    
    if (collectExecutionTime) {
      branch.executionTime = performance.now() - now
    }

    branch.timestamp = now

    return conditionResult
  }

  private shouldSample(): boolean {
    this.sampleCounter++
    return (this.sampleCounter * this.samplingConfig.sampleRate) % 1 < this.samplingConfig.sampleRate
  }

  private isRateLimited(now: number): boolean {
    const timeSinceLastSample = now - this.lastSampleTime
    const minInterval = 1000 / this.samplingConfig.maxSamplesPerSecond
    
    if (timeSinceLastSample < minInterval) {
      return true
    }
    
    this.lastSampleTime = now
    return false
  }

  getBranchStats(): BranchStats {
    return { ...this.branchStats }
  }

  getExecutionSummary() {
    const stats = Object.values(this.branchStats)
    const totalBranches = stats.length
    const hitBranches = stats.filter(b => b.hitCount > 0).length
    const coldBranches = stats.filter(b => b.hitCount > 0 && b.hitCount < 5).length
    const hotBranches = stats.filter(b => b.hitCount > 100).length
    const deadBranches = stats.filter(b => b.hitCount === 0).length

    const fileStats = stats.reduce((acc, branch) => {
      if (!acc[branch.file]) {
        acc[branch.file] = { total: 0, hit: 0, dead: 0, hot: 0, cold: 0 }
      }
      acc[branch.file].total++
      
      if (branch.hitCount === 0) {
        acc[branch.file].dead++
      } else if (branch.hitCount > 100) {
        acc[branch.file].hot++
      } else if (branch.hitCount < 5) {
        acc[branch.file].cold++
      } else {
        acc[branch.file].hit++
      }
      
      return acc
    }, {} as Record<string, { total: number; hit: number; dead: number; hot: number; cold: number }>)

    return {
      summary: {
        totalBranches,
        hitBranches,
        deadBranches,
        hotBranches,
        coldBranches,
        coverageRate: totalBranches > 0 ? hitBranches / totalBranches : 0
      },
      fileStats,
      topDeadCodeFiles: Object.entries(fileStats)
        .filter(([_, stats]) => stats.dead > 0)
        .sort(([_, a], [__, b]) => b.dead - a.dead)
        .slice(0, 10)
        .map(([file, stats]) => ({ file, deadBranches: stats.dead, totalBranches: stats.total })),
      
      topHotPathFiles: Object.entries(fileStats)
        .filter(([_, stats]) => stats.hot > 0)
        .sort(([_, a], [__, b]) => b.hot - a.hot)
        .slice(0, 10)
        .map(([file, stats]) => ({ file, hotBranches: stats.hot, totalBranches: stats.total }))
    }
  }

  clearStats() {
    this.branchStats = {}
    this.sampleCounter = 0
    this.lastSampleTime = 0
  }

  updateConfig(newConfig: Partial<RuntimeCoverageConfig>) {
    this.config = { ...this.config, ...newConfig }
    this.samplingConfig = { ...this.samplingConfig, ...(newConfig.sampling || {}) }
  }

  private startAnalyticsReporting() {
    // Send summary every 30 seconds
    setInterval(() => {
      if (Object.keys(this.branchStats).length === 0) return

      const event: AnalyticsEvent = {
        type: 'execution-summary',
        data: this.branchStats,
        timestamp: Date.now(),
        sessionId: this.sessionId
      }

      this.sendToAnalytics(event)
    }, 30000)

    // Send on page unload
    window.addEventListener('beforeunload', () => {
      if (Object.keys(this.branchStats).length > 0) {
        const event: AnalyticsEvent = {
          type: 'execution-summary',
          data: this.branchStats,
          timestamp: Date.now(),
          sessionId: this.sessionId
        }

        this.sendToAnalytics(event)
      }
    })
  }

  private sendToAnalytics(event: AnalyticsEvent) {
    if (!this.config.analyticsEndpoint) return

    fetch(this.config.analyticsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event)
    }).catch(error => {
      console.warn('Failed to send analytics:', error)
    })
  }

  // Public API for external access
  exportData() {
    return {
      branchStats: this.getBranchStats(),
      executionSummary: this.getExecutionSummary(),
      config: this.config,
      sessionId: this.sessionId
    }
  }

  importData(data: { branchStats: BranchStats }) {
    this.branchStats = { ...this.branchStats, ...data.branchStats }
  }
}

export default RuntimeCoverageCollector