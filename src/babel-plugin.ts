import { PluginObj, NodePath, types as t } from '@babel/core'
import { InstrumentationContext } from './types/index.js'

interface BabelPluginState {
  file: {
    opts: {
      filename: string
    }
  }
}

const DEFAULT_CONFIG = {
  enabled: true,
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

function createBranchId(fileName: string, line: number, column: number, type: string, counter: number): string {
  const cleanFileName = fileName.replace(process.cwd(), '').replace(/^\//, '')
  return `${cleanFileName}:${line}:${column}:${type}#${counter}`
}

function createInstrumentationCall(
  branchId: string,
  conditionCode: string,
  conditionResult: t.Expression,
  type: string,
  collectExecutionTime: boolean = false
): t.CallExpression {
  const args: t.Expression[] = [
    t.stringLiteral(branchId),
    t.stringLiteral(type),
    t.stringLiteral(conditionCode),
    conditionResult
  ]

  if (collectExecutionTime) {
    args.push(t.booleanLiteral(true))
  }

  return t.callExpression(
    t.memberExpression(
      t.memberExpression(t.identifier('window'), t.identifier('__RUNTIME_COVERAGE__')),
      t.identifier('recordBranchHit')
    ),
    args
  )
}

export default function runtimeCoverageBabelPlugin(options: any = {}): PluginObj<BabelPluginState> {
  const config = { ...DEFAULT_CONFIG, ...options }
  
  if (!config.enabled) {
    return { visitor: {} }
  }

  return {
    name: 'runtime-coverage-instrumentation',
    visitor: {
      Program: {
        enter(path, state) {
          const fileName = state.file.opts.filename || 'unknown'
          
          // Skip if file matches exclude patterns
          if (config.excludePatterns.some((pattern: string) => 
            fileName.includes(pattern.replace('**/', '').replace('*', ''))
          )) {
            return
          }

          // Initialize instrumentation context
          ;(state as any).instrumentationContext = {
            fileName,
            branchCounter: 0,
            config
          } as InstrumentationContext
        }
      },

      IfStatement(path, state) {
        const context = (state as any).instrumentationContext as InstrumentationContext
        if (!context) return

        const { line, column } = path.node.loc?.start || { line: 0, column: 0 }
        const branchId = createBranchId(context.fileName, line, column, 'if', context.branchCounter++)
        
        const test = path.node.test
        const conditionCode = path.getSource().slice(3, path.getSource().indexOf(')') + 1) // Extract condition
        
        // Create instrumented condition
        const instrumentedTest = t.sequenceExpression([
          createInstrumentationCall(branchId, conditionCode, test, 'if', context.config.sampling.collectExecutionTime),
          test
        ])

        path.node.test = instrumentedTest
      },

      ConditionalExpression(path, state) {
        const context = (state as any).instrumentationContext as InstrumentationContext
        if (!context) return

        const { line, column } = path.node.loc?.start || { line: 0, column: 0 }
        const branchId = createBranchId(context.fileName, line, column, 'ternary', context.branchCounter++)
        
        const test = path.node.test
        const conditionCode = path.getSource().split('?')[0].trim()
        
        const instrumentedTest = t.sequenceExpression([
          createInstrumentationCall(branchId, conditionCode, test, 'ternary', context.config.sampling.collectExecutionTime),
          test
        ])

        path.node.test = instrumentedTest
      },

      SwitchStatement(path, state) {
        const context = (state as any).instrumentationContext as InstrumentationContext
        if (!context) return

        const { line, column } = path.node.loc?.start || { line: 0, column: 0 }
        const discriminant = path.node.discriminant
        
        // Instrument each case
        path.node.cases.forEach((caseNode, index) => {
          if (caseNode.test) {
            const caseId = createBranchId(context.fileName, line, column, 'switch-case', context.branchCounter++)
            const conditionCode = `case ${path.getSource().match(/case\s+([^:]+):/)?.[1] || 'unknown'}`
            
            // Add instrumentation at the beginning of each case
            const instrumentation = t.expressionStatement(
              createInstrumentationCall(caseId, conditionCode, caseNode.test, 'switch-case', context.config.sampling.collectExecutionTime)
            )
            
            caseNode.consequent.unshift(instrumentation)
          }
        })
      },

      LogicalExpression(path, state) {
        const context = (state as any).instrumentationContext as InstrumentationContext
        if (!context) return

        // Only instrument && and || operators
        if (path.node.operator !== '&&' && path.node.operator !== '||') return

        const { line, column } = path.node.loc?.start || { line: 0, column: 0 }
        const branchId = createBranchId(context.fileName, line, column, 'logical', context.branchCounter++)
        
        const left = path.node.left
        const conditionCode = path.getSource()
        
        const instrumentedLeft = t.sequenceExpression([
          createInstrumentationCall(branchId, conditionCode, left, 'logical', context.config.sampling.collectExecutionTime),
          left
        ])

        path.node.left = instrumentedLeft
      },

      // JSX Conditional Rendering
      JSXExpressionContainer(path, state) {
        const context = (state as any).instrumentationContext as InstrumentationContext
        if (!context) return

        const expression = path.node.expression
        
        // Handle {condition && <Component />}
        if (t.isLogicalExpression(expression) && expression.operator === '&&') {
          const { line, column } = path.node.loc?.start || { line: 0, column: 0 }
          const branchId = createBranchId(context.fileName, line, column, 'jsx-conditional', context.branchCounter++)
          
          const left = expression.left
          const conditionCode = path.getSource()
          
          const instrumentedLeft = t.sequenceExpression([
            createInstrumentationCall(branchId, conditionCode, left, 'jsx-conditional', context.config.sampling.collectExecutionTime),
            left
          ])

          expression.left = instrumentedLeft
        }

        // Handle {condition ? <A /> : <B />}
        if (t.isConditionalExpression(expression)) {
          const { line, column } = path.node.loc?.start || { line: 0, column: 0 }
          const branchId = createBranchId(context.fileName, line, column, 'jsx-ternary', context.branchCounter++)
          
          const test = expression.test
          const conditionCode = path.getSource().split('?')[0].trim()
          
          const instrumentedTest = t.sequenceExpression([
            createInstrumentationCall(branchId, conditionCode, test, 'jsx-ternary', context.config.sampling.collectExecutionTime),
            test
          ])

          expression.test = instrumentedTest
        }
      }
    }
  }
}