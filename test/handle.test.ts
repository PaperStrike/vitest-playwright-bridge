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
})
