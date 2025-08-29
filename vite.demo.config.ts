import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          [resolve(__dirname, 'src/babel-plugin.ts'), {
            enabled: true,
            excludePatterns: ['node_modules/**'],
            sampling: {
              enabled: false, // Disable sampling for demo
              collectExecutionTime: true
            }
          }]
        ]
      }
    })
  ],
  root: 'example',
  resolve: {
    alias: {
      'runtime-coverage-frontend': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 3000,
    open: true
  }
})