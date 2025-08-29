# Runtime Coverage Frontend 🔧

**React Dev Tools on Steroids** - A runtime branch coverage analysis tool for performance optimization and code health monitoring.

## ✨ What This Tool Does

This package fills the gap between traditional profilers and static analysis tools by providing **runtime branch execution analysis**:

- 🎯 **Which branches/conditions are actually hit in production?**
- 🗑️ **Do we carry around unused if/else logic that never executes?**
- 🔥 **Can we map out execution trees to find hot paths vs cold/unreachable ones?**

## 🔹 Why Existing Tools Don't Solve This

| Tool | What it Shows | What it Misses |
|------|---------------|----------------|
| **Profiler** (Chrome DevTools, React Profiler) | CPU time, function calls | Branch execution frequency |
| **Coverage** (c8, V8 inspector) | Unused functions/lines | Branch frequency & execution patterns |
| **Bundle Analyzers** | Code weight & dependencies | Runtime execution behavior |

**Runtime Coverage Frontend** bridges this gap by providing data-driven insights into your code's execution patterns.

## 🚀 Features

### 🔍 Branch-Level Analysis
- **If/else statements** - Track which branches are taken
- **Ternary operators** - Monitor conditional expressions  
- **Switch cases** - See which cases actually execute
- **Logical operators** (`&&`, `||`) - Analyze short-circuit evaluation
- **JSX conditionals** - Track React conditional rendering

### 📊 Real-time Visualization
- **Branch Heatmaps** - Visual representation of execution frequency
- **Execution Trees** - Flow diagrams showing hot/cold paths
- **Dead Code Detection** - Identify unused branches
- **Performance Insights** - Find optimization opportunities

### ⚡ Production-Ready
- **Low Overhead** - Configurable sampling (1% in production)
- **Rate Limiting** - Prevents performance impact
- **Analytics Integration** - Send data to your backend
- **Development Tools** - Rich debugging interface

## 📦 Installation

```bash
npm install runtime-coverage-frontend
# or
yarn add runtime-coverage-frontend
# or
pnpm add runtime-coverage-frontend
```

## 🛠️ Quick Setup

### 1. Vite Plugin Setup

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { runtimeCoveragePlugin } from 'runtime-coverage-frontend/vite'

export default defineConfig({
  plugins: [
    react(),
    runtimeCoveragePlugin({
      // Enable in development
      injectInDev: true,
      // Enable in production with sampling
      injectInProd: true,
      sampling: {
        enabled: true,
        sampleRate: 0.01, // 1% sampling
        maxSamplesPerSecond: 100
      },
      // Send data to your analytics
      sendToAnalytics: true,
      analyticsEndpoint: '/api/runtime-coverage'
    })
  ]
})
```

### 2. Initialize in Your App

```typescript
// src/main.tsx or src/index.tsx
import { initializeRuntimeCoverage } from 'runtime-coverage-frontend'

// Initialize before rendering your app
initializeRuntimeCoverage({
  enabled: true,
  visualizationEnabled: process.env.NODE_ENV === 'development',
  sampling: {
    enabled: process.env.NODE_ENV === 'production',
    sampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0
  }
})

// Your app code...
```

### 3. Use React Hook (Optional)

```tsx
import { useRuntimeCoverage } from 'runtime-coverage-frontend'

function DevPanel() {
  const { branchStats, summary, clearStats, exportData } = useRuntimeCoverage()
  
  return (
    <div>
      <h3>Coverage: {(summary?.coverageRate * 100).toFixed(1)}%</h3>
      <p>Dead branches: {summary?.deadBranches}</p>
      <button onClick={clearStats}>Clear</button>
      <button onClick={exportData}>Export</button>
    </div>
  )
}
```

## 🎯 Usage Examples

### Development Mode

```typescript
// After setup, use keyboard shortcut:
// Ctrl+Shift+C - Toggle coverage panel

// Or programmatically:
import { openCoveragePanel } from 'runtime-coverage-frontend'
openCoveragePanel('bottom') // 'bottom' | 'right' | 'fullscreen'
```

### Production Analytics

```typescript
// vite.config.ts
runtimeCoveragePlugin({
  injectInProd: true,
  sampling: { enabled: true, sampleRate: 0.01 },
  sendToAnalytics: true,
  analyticsEndpoint: '/api/coverage'
})

// Your backend endpoint
app.post('/api/coverage', (req, res) => {
  const { type, data, sessionId } = req.body
  // Store coverage data for analysis
  analytics.track('runtime_coverage', data)
  res.status(200).send('OK')
})
```

### Custom Babel Plugin Usage

```javascript
// babel.config.js
module.exports = {
  plugins: [
    ['runtime-coverage-frontend/babel', {
      enabled: process.env.NODE_ENV === 'development',
      excludePatterns: ['node_modules/**', '**/*.test.*'],
      sampling: {
        collectExecutionTime: true
      }
    }]
  ]
}
```

## 🔧 API Reference

### Configuration

```typescript
interface RuntimeCoverageConfig {
  enabled: boolean
  sampling: {
    enabled: boolean
    sampleRate: number        // 0.01 = 1%
    maxSamplesPerSecond: number
    collectExecutionTime: boolean
  }
  excludePatterns: string[]   // ['node_modules/**']
  includePatterns: string[]   // ['**/*.{js,jsx,ts,tsx}']
  sendToAnalytics: boolean
  analyticsEndpoint?: string
  visualizationEnabled: boolean
}
```

### Global API

```typescript
// Available on window object
window.__RUNTIME_COVERAGE__ = {
  getBranchStats(): BranchStats
  getExecutionSummary(): ExecutionSummary
  clearStats(): void
  exportData(): CoverageExport
}

// Development tools
window.__RUNTIME_COVERAGE_DEV_TOOLS__ = {
  findDeadCode(): BranchHit[]
  findHotPaths(threshold?: number): BranchHit[]
  generateReport(): CoverageReport
  openPanel(position?: 'bottom' | 'right' | 'fullscreen'): void
}
```

### React Components

```tsx
import { 
  BranchHeatmap, 
  ExecutionTree, 
  CoveragePanel 
} from 'runtime-coverage-frontend'

<BranchHeatmap 
  branchStats={stats}
  selectedFile="src/App.tsx"
  onBranchClick={(branchId) => console.log(branchId)}
/>

<ExecutionTree 
  branchStats={stats}
  selectedFile="src/components/Dashboard.tsx"
  onNodeSelect={(branchId) => navigateToCode(branchId)}
/>

<CoveragePanel 
  isOpen={showPanel}
  onClose={() => setShowPanel(false)}
  position="bottom"
/>
```

## 📊 Understanding the Data

### Branch Types Tracked

```typescript
type BranchType = 
  | 'if'              // if (condition) { ... }
  | 'switch'          // switch (value) { case ... }
  | 'ternary'         // condition ? a : b
  | 'logical'         // a && b, a || b
  | 'jsx-conditional' // {condition && <Component />}
```

### Coverage Metrics

```typescript
interface BranchHit {
  branchId: string      // Unique identifier
  file: string          // Source file path
  line: number          // Line number
  column: number        // Column number
  type: BranchType      // Type of branch
  condition: string     // Source code condition
  hitCount: number      // Times condition was true
  missCount: number     // Times condition was false
  executionTime?: number // Performance timing (optional)
}
```

### Example Output

```javascript
// Dead code example
{
  branchId: "src/Dashboard.tsx:45:8:if#3",
  condition: "user.role === 'superadmin'",
  hitCount: 0,      // Never executed!
  missCount: 0,     // Never reached!
  type: "if"
}

// Hot path example  
{
  branchId: "src/UserList.tsx:23:12:jsx-conditional#1", 
  condition: "users.length > 0",
  hitCount: 2847,   // Frequently true
  missCount: 12,    // Rarely false
  type: "jsx-conditional"
}
```

## 🎨 Visualization Guide

### 1. Branch Heatmap
- **Red circles** = Dead code (never executed)
- **Yellow circles** = Cold paths (<20% hit rate)  
- **Green circles** = Hot paths (>80% hit rate)
- **Circle size** = Execution frequency

### 2. Execution Tree
- **Red nodes** = Dead branches
- **Green nodes** = Hot execution paths
- **Orange nodes** = Cold/rare paths
- **Node size** = Execution frequency
- **Edge thickness** = Flow intensity

### 3. Summary Dashboard
- **Coverage Rate** = % of branches executed
- **Dead Code Files** = Files with unused branches
- **Hot Path Files** = Files with performance-critical branches

## 🔍 Finding Optimization Opportunities

### Dead Code Elimination

```javascript
// Find unused branches
const deadBranches = window.__RUNTIME_COVERAGE_DEV_TOOLS__.findDeadCode()

// Example output:
[
  {
    file: "src/Dashboard.tsx",
    line: 45,
    condition: "user.role === 'superadmin'",
    // This branch is never hit - can we remove it?
  }
]
```

### Hot Path Optimization

```javascript
// Find performance-critical branches
const hotPaths = window.__RUNTIME_COVERAGE_DEV_TOOLS__.findHotPaths(100)

// Example output:
[
  {
    file: "src/ProductList.tsx", 
    line: 67,
    condition: "products.length > 0",
    hitCount: 15000, // Very frequent - optimize this!
    // Consider memoization, virtualization, etc.
  }
]
```

### Lazy Loading Candidates

```javascript
// Find rarely used features
const coldPaths = window.__RUNTIME_COVERAGE_DEV_TOOLS__.findColdPaths(5)

// Features hit <5 times could be lazy loaded
[
  {
    file: "src/AdminPanel.tsx",
    condition: "user.role === 'admin'",
    hitCount: 2, // Rarely used - lazy load candidate
  }
]
```

## 🚀 Advanced Use Cases

### 1. A/B Testing Analysis

```typescript
// Track which feature variants are actually used
if (featureFlag.newDashboard) {
  // This branch will be tracked
  return <NewDashboard />
} else {
  // This branch will be tracked too
  return <OldDashboard />
}

// Later: analyze which variant gets more execution
```

### 2. Performance Monitoring

```typescript
// High-frequency components - monitor for performance
const ProductCard = ({ product }) => {
  // These conditions execute thousands of times
  return (
    <div>
      {product.onSale && <SaleBadge />}
      {product.featured && <FeaturedBadge />}
      {product.inventory > 0 ? (
        <BuyButton />
      ) : (
        <OutOfStockButton />
      )}
    </div>
  )
}
```

### 3. Progressive Enhancement

```typescript
// Track browser capability usage
const AdvancedFeatures = () => {
  return (
    <>
      {supportsWebGL && <3DVisualization />}
      {supportsWebAssembly && <HighPerformanceFilter />}
      {supportsOfflineStorage && <OfflineSync />}
    </>
  )
}

// Optimize based on actual browser usage patterns
```

## 🛟 Troubleshooting

### Common Issues

**Q: No data appearing in visualizations?**
A: Check that the collector is initialized and instrumentation is working:
```javascript
console.log(window.__RUNTIME_COVERAGE__?.getBranchStats())
```

**Q: Performance impact in production?**
A: Ensure sampling is enabled:
```typescript
sampling: { enabled: true, sampleRate: 0.01 } // 1%
```

**Q: Coverage panel not opening?**
A: Make sure visualization is enabled:
```typescript
initializeRuntimeCoverage({ visualizationEnabled: true })
```

**Q: Babel plugin not instrumenting code?**
A: Check your babel config includes the plugin:
```javascript
plugins: [['runtime-coverage-frontend/babel', { enabled: true }]]
```

### Debug Commands

```javascript
// Check if collector is running
!!window.__RUNTIME_COVERAGE__

// Get current stats
window.__RUNTIME_COVERAGE__.getBranchStats()

// Development tools
window.__RUNTIME_COVERAGE_DEV_TOOLS__.generateReport()
```

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines.

## 📄 License

MIT License - see LICENSE file for details.

## 🎯 Roadmap

- [ ] **TypeScript Integration** - Better type inference for conditions
- [ ] **Source Maps Support** - Map instrumented code back to original
- [ ] **Webpack Plugin** - Support for Webpack-based projects  
- [ ] **Node.js Support** - Server-side branch analysis
- [ ] **VS Code Extension** - IDE integration with coverage highlights
- [ ] **CI/CD Integration** - Automated coverage reports in PR reviews
- [ ] **Machine Learning** - Predictive analysis for optimization suggestions

---

**Happy Analyzing! 🚀**

*Built with ❤️ for performance-conscious developers*# frontsense
