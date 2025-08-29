export interface BranchHit {
  branchId: string
  file: string
  line: number
  column: number
  type: 'if' | 'switch' | 'ternary' | 'logical' | 'jsx-conditional'
  condition: string
  hitCount: number
  missCount: number
  timestamp: number
  executionTime?: number
}

export interface BranchStats {
  [branchId: string]: BranchHit
}

export interface ExecutionTreeNode {
  branchId: string
  condition: string
  hitRate: number
  children: ExecutionTreeNode[]
  isHotPath: boolean
  isColdPath: boolean
  isDeadCode: boolean
}

export interface HeatmapData {
  file: string
  branches: Array<{
    line: number
    column: number
    hitRate: number
    condition: string
    executionCount: number
  }>
}

export interface SamplingConfig {
  enabled: boolean
  sampleRate: number // 0.01 = 1%
  maxSamplesPerSecond: number
  collectExecutionTime: boolean
}

export interface RuntimeCoverageConfig {
  enabled: boolean
  sampling: SamplingConfig
  excludePatterns: string[]
  includePatterns: string[]
  sendToAnalytics: boolean
  analyticsEndpoint?: string
  visualizationEnabled: boolean
}

export interface InstrumentationContext {
  fileName: string
  branchCounter: number
  config: RuntimeCoverageConfig
}

export interface AnalyticsEvent {
  type: 'branch-hit' | 'execution-summary'
  data: BranchHit | BranchStats
  timestamp: number
  sessionId: string
  userId?: string
}