import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { playwrightBridge } from './src/plugin'

export default defineConfig({
  plugins: [playwrightBridge()],
  resolve: {
    alias: {
      'vitest-playwright-bridge/browser': '/src/browser/index.ts',
      'vitest-playwright-bridge/plugin': '/src/plugin/index.ts',
    },
  },
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [
        { browser: 'chromium' },
      ],
      headless: true,
      screenshotFailures: false,
    },
    testTimeout: 5000,
    hookTimeout: 5000,
  },
  esbuild: {
    target: 'es2022',
  },
})
