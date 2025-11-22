import { describe, test, expect } from 'vitest'
import { pageHandle } from 'vitest-playwright-bridge/browser'

describe('CSS media emulation', () => {
  test.afterEach(async () => {
    await pageHandle.evaluate(async (page) => {
      await page.emulateMedia({
        colorScheme: null,
        contrast: null,
        forcedColors: null,
        media: null,
        reducedMotion: null,
      })
    })
  })

  test('should set dark mode', async () => {
    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(false)

    await pageHandle.evaluate(async (page) => {
      await page.emulateMedia({ colorScheme: 'dark' })
    })

    expect(window.matchMedia('(prefers-color-scheme: dark)').matches).toBe(true)
  })

  test('should set reduced motion', async () => {
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false)

    await pageHandle.evaluate(async (page) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
    })

    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(true)
  })
})
