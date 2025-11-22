import { describe, test, expect } from 'vitest'
import { bypassFetch, route, unrouteAll } from 'vitest-playwright-bridge/browser'

describe('network request routing', () => {
  test.afterEach(async () => {
    await unrouteAll({ behavior: 'wait' })
  })

  test('should reply with Hello World', async () => {
    await route('/hello', async (route) => {
      await route.fulfill({ body: 'Hello World' })
    })

    const response = await fetch('/hello')
    const text = await response.text()
    expect(text).toBe('Hello World')
  })

  test('should bypass route with bypassFetch', async () => {
    const pathThatWontExist = `/path-that-wont-exist?id=${crypto.randomUUID()}`
    await route(pathThatWontExist, async (route) => {
      await route.fulfill({ status: 200 })
    })

    const mockedResponse = await fetch(pathThatWontExist)
    expect(mockedResponse.status).toBe(200)

    const bypassedResponse = await bypassFetch(pathThatWontExist)
    expect(bypassedResponse.status).toBe(404)
  })
})
