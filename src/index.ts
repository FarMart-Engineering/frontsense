export { default as RuntimeCoverageCollector } from './core/runtime-collector'
export { default as runtimeCoverageBabelPlugin } from './babel-plugin'
export { default as runtimeCoveragePlugin } from './vite-plugin'

// React components
export { default as BranchHeatmap } from './components/BranchHeatmap'
export { default as ExecutionTree } from './components/ExecutionTree'
export { default as CoveragePanel } from './components/CoveragePanel'

// Types
export * from './types'

// Utilities
export { initializeRuntimeCoverage, openCoveragePanel } from './utils/dev-tools'

// Hook for React applications
export { useRuntimeCoverage } from './utils/react-hook'