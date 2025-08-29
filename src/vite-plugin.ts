import { Plugin } from 'vite'
import { RuntimeCoverageConfig } from './types'
import runtimeCoverageBabelPlugin from './babel-plugin'

export interface ViteRuntimeCoverageOptions extends Partial<RuntimeCoverageConfig> {
  // Additional Vite-specific options
  injectInDev?: boolean
  injectInProd?: boolean
  initScript?: string
}

const DEFAULT_OPTIONS: ViteRuntimeCoverageOptions = {
  enabled: true,
  injectInDev: true,
  injectInProd: false,
  sampling: {
    enabled: false,
    sampleRate: 1.0,
    maxSamplesPerSecond: 1000,
    collectExecutionTime: false
  },
  excludePatterns: ['node_modules/**', '**/*.test.*', '**/*.spec.*'],
  includePatterns: ['**/*.{js,jsx,ts,tsx}'],
  sendToAnalytics: false,
  visualizationEnabled: true
}

export function runtimeCoveragePlugin(options: ViteRuntimeCoverageOptions = {}): Plugin {
  const config = { ...DEFAULT_OPTIONS, ...options }
  
  return {
    name: 'vite-plugin-runtime-coverage',
    
    configResolved(resolvedConfig) {
      // Adjust config based on build mode
      const isDev = resolvedConfig.command === 'serve'
      const isProd = resolvedConfig.command === 'build'
      
      if (isDev && !config.injectInDev) {
        config.enabled = false
      }
      
      if (isProd && !config.injectInProd) {
        config.enabled = false
      }
      
      // Enable sampling in production by default
      if (isProd && config.sampling) {
        config.sampling.enabled = true
        config.sampling.sampleRate = config.sampling.sampleRate || 0.01 // 1% sampling
      }
    },

    transformIndexHtml: {
      enforce: 'pre',
      transform(html, context) {
        if (!config.enabled) return html

        // Inject runtime initialization script
        const initScript = config.initScript || this.generateInitScript(config)
        
        return html.replace(
          '<head>',
          `<head>
          <script>
            ${initScript}
          </script>`
        )
      }
    },

    transform(code, id) {
      if (!config.enabled) return null

      // Skip non-JS/TS files
      if (!/\.(js|jsx|ts|tsx)$/.test(id)) return null
      
      // Skip excluded patterns
      if (config.excludePatterns?.some(pattern => 
        id.includes(pattern.replace('**/', '').replace('*', ''))
      )) {
        return null
      }

      // Apply Babel transformation
      const babel = require('@babel/core')
      
      try {
        const result = babel.transformSync(code, {
          filename: id,
          plugins: [
            [runtimeCoverageBabelPlugin, config]
          ],
          sourceMaps: true
        })
        
        return {
          code: result?.code || code,
          map: result?.map
        }
      } catch (error) {
        console.warn(`Runtime coverage instrumentation failed for ${id}:`, error)
        return null
      }
    },

    generateBundle() {
      if (!config.enabled) return

      // Add runtime collector as a separate chunk
      this.emitFile({
        type: 'asset',
        fileName: 'runtime-coverage-collector.js',
        source: this.generateCollectorScript(config)
      })
    },

    generateInitScript(config: ViteRuntimeCoverageOptions): string {
      return `
        // Runtime Coverage Initialization
        (function() {
          if (typeof window === 'undefined') return;
          
          // Configuration
          window.__RUNTIME_COVERAGE_CONFIG__ = ${JSON.stringify(config)};
          
          // Initialize collector
          if (!window.__RUNTIME_COVERAGE_INITIALIZED__) {
            window.__RUNTIME_COVERAGE_INITIALIZED__ = true;
            
            // Load collector dynamically
            const script = document.createElement('script');
            script.src = '/runtime-coverage-collector.js';
            script.async = true;
            document.head.appendChild(script);
          }
          
          ${config.visualizationEnabled ? this.generateDevToolsScript() : ''}
        })();
      `
    },

    generateCollectorScript(config: ViteRuntimeCoverageOptions): string {
      return `
        // Runtime Coverage Collector
        (function() {
          if (typeof window === 'undefined') return;
          
          class RuntimeCoverageCollector {
            constructor(config) {
              this.branchStats = {};
              this.config = config;
              this.samplingConfig = config.sampling || {};
              this.sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
              this.sampleCounter = 0;
              this.lastSampleTime = 0;
              
              this.initializeGlobalInterface();
              
              if (config.sendToAnalytics && config.analyticsEndpoint) {
                this.startAnalyticsReporting();
              }
            }
            
            initializeGlobalInterface() {
              window.__RUNTIME_COVERAGE__ = {
                recordBranchHit: this.recordBranchHit.bind(this),
                getBranchStats: () => ({ ...this.branchStats }),
                getExecutionSummary: this.getExecutionSummary.bind(this),
                clearStats: () => { this.branchStats = {}; this.sampleCounter = 0; },
                updateConfig: (newConfig) => { this.config = { ...this.config, ...newConfig }; },
                exportData: () => ({
                  branchStats: this.branchStats,
                  executionSummary: this.getExecutionSummary(),
                  config: this.config,
                  sessionId: this.sessionId
                })
              };
            }
            
            recordBranchHit(branchId, type, conditionCode, conditionResult, collectExecutionTime = false) {
              // Sampling logic
              if (this.samplingConfig.enabled && !this.shouldSample()) {
                return conditionResult;
              }
              
              const now = performance.now();
              
              if (this.samplingConfig.enabled && this.isRateLimited(now)) {
                return conditionResult;
              }
              
              const [filePath, line, column, branchType] = branchId.split(':');
              
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
                };
              }
              
              const branch = this.branchStats[branchId];
              
              if (conditionResult) {
                branch.hitCount++;
              } else {
                branch.missCount++;
              }
              
              if (collectExecutionTime) {
                branch.executionTime = performance.now() - now;
              }
              
              branch.timestamp = now;
              return conditionResult;
            }
            
            shouldSample() {
              this.sampleCounter++;
              return (this.sampleCounter * this.samplingConfig.sampleRate) % 1 < this.samplingConfig.sampleRate;
            }
            
            isRateLimited(now) {
              const timeSinceLastSample = now - this.lastSampleTime;
              const minInterval = 1000 / this.samplingConfig.maxSamplesPerSecond;
              
              if (timeSinceLastSample < minInterval) {
                return true;
              }
              
              this.lastSampleTime = now;
              return false;
            }
            
            getExecutionSummary() {
              const stats = Object.values(this.branchStats);
              const totalBranches = stats.length;
              const hitBranches = stats.filter(b => b.hitCount > 0).length;
              const deadBranches = stats.filter(b => b.hitCount === 0).length;
              
              return {
                totalBranches,
                hitBranches,
                deadBranches,
                coverageRate: totalBranches > 0 ? hitBranches / totalBranches : 0,
                sessionId: this.sessionId
              };
            }
            
            startAnalyticsReporting() {
              setInterval(() => {
                if (Object.keys(this.branchStats).length === 0) return;
                this.sendToAnalytics({
                  type: 'execution-summary',
                  data: this.branchStats,
                  timestamp: Date.now(),
                  sessionId: this.sessionId
                });
              }, 30000);
              
              window.addEventListener('beforeunload', () => {
                if (Object.keys(this.branchStats).length > 0) {
                  this.sendToAnalytics({
                    type: 'execution-summary',
                    data: this.branchStats,
                    timestamp: Date.now(),
                    sessionId: this.sessionId
                  });
                }
              });
            }
            
            sendToAnalytics(event) {
              if (!this.config.analyticsEndpoint) return;
              
              fetch(this.config.analyticsEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
              }).catch(error => {
                console.warn('Failed to send analytics:', error);
              });
            }
          }
          
          // Initialize collector
          const config = window.__RUNTIME_COVERAGE_CONFIG__ || {};
          new RuntimeCoverageCollector(config);
          
        })();
      `
    },

    generateDevToolsScript(): string {
      return `
        // Development visualization helpers
        window.__RUNTIME_COVERAGE_DEV__ = {
          logStats: function() {
            const stats = window.__RUNTIME_COVERAGE__?.getBranchStats();
            if (stats) {
              console.table(Object.values(stats));
            }
          },
          
          showSummary: function() {
            const summary = window.__RUNTIME_COVERAGE__?.getExecutionSummary();
            if (summary) {
              console.log('📊 Runtime Coverage Summary:', summary);
            }
          },
          
          highlightDeadCode: function() {
            const stats = window.__RUNTIME_COVERAGE__?.getBranchStats();
            if (!stats) return;
            
            const deadBranches = Object.values(stats).filter(b => b.hitCount === 0);
            console.log('💀 Dead branches found:', deadBranches);
            
            // Visual highlighting could be added here
          },
          
          exportToFile: function() {
            const data = window.__RUNTIME_COVERAGE__?.exportData();
            if (data) {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'runtime-coverage-' + new Date().toISOString() + '.json';
              a.click();
            }
          }
        };
        
        console.log('🔧 Runtime Coverage DevTools loaded. Use window.__RUNTIME_COVERAGE_DEV__ for debugging.');
      `
    }
  }
}

export default runtimeCoveragePlugin