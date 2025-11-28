import { describe, test, expect } from 'vitest'
import { bypassFetch, pageHandle, route, unrouteAll } from 'vitest-playwright-bridge/browser'
import { routeBypassFetchHeader } from '../src/shared/utils'

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

  test('should bypass route without affecting headers', async ({ onTestFinished }) => {
    // Create a simple server that echoes request headers
    const serverHandle = await pageHandle.evaluateHandle(async () => {
      const { createServer } = await import('node:http')
      return createServer((req, res) => {
        res.writeHead(200, {
          'access-control-allow-origin': '*',
          'access-control-allow-headers': '*',
          'content-type': 'application/json',
        })
        res.end(JSON.stringify(req.headers))
      })
    })

    // Start the server
    const addressInfo = await serverHandle.evaluate(async (server) => {
      await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
      return server.address() as ReturnType<typeof server.address> & object
    })
    onTestFinished(async () => {
      await serverHandle.evaluate(server => new Promise(resolve => server.close(resolve)))
    })

    // Prepare the route to be bypassed
    const url = `http://${addressInfo.address}:${addressInfo.port}/echo-headers`
    await route(url, async (route) => {
      await route.fulfill({ status: 200, body: 'Mocked Response' })
    })

    // Test that normal fetch gets the mocked response
    const mockedResponse = await fetch(url)
    const mockedBodyText = await mockedResponse.text()
    expect(mockedBodyText).toBe('Mocked Response')

    // Test that bypassFetch gets the real server response without extra headers
    const testHeaders = {
      'x-custom-header': 'should be kept as is',
      [routeBypassFetchHeader]: 'should also be kept as is',
    }
    const bypassedResponse = await bypassFetch(url, { headers: testHeaders })
    const bypassedBodyJson = await bypassedResponse.json() as Record<string, string>
    expect(bypassedBodyJson).toMatchObject(testHeaders)
  })
})
