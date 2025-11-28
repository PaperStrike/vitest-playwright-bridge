import { describe, test, expect } from 'vitest'
import { contextHandle } from 'vitest-playwright-bridge/browser'

describe('handle', () => {
  test('should evaluate to browser handle and then the version', async () => {
    const browserHandle = await contextHandle.evaluateHandle(context => context.browser()!)

    // chromium version looks like "141.0.7390.37"
    // firefox: "142.0.1"
    // webkit: "26.0"
    const version = await browserHandle.evaluate(browser => browser.version())
    expect(version).toMatch(/^\d+\.\d+/)
  })

  test('should preserve Error.stack', async () => {
    const error = new Error('Test error with stack')
    error.stack = 'mocked stack'
    const passedError = await contextHandle.evaluate((_, e) => e, error)
    expect(passedError.stack).toBe('mocked stack')
  })

  describe('dynamic import in evaluate', () => {
    test('should support Node.js built-in modules', async () => {
      const releaseName = await contextHandle.evaluate(async () => {
        const process = await import('node:process')
        return process.release.name
      })
      expect(releaseName).toBe('node')
    })

    test.fails('should support relative imports', async () => {
      const result = await contextHandle.evaluate(async () => {
        const { default: globToRegex } = await import('../src/shared/globToRegex')
        return globToRegex('**')
      })
      expect(result).toBeInstanceOf(RegExp)
    })
  })
})
