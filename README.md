# vitest-playwright-bridge
[![npm Package](https://img.shields.io/npm/v/vitest-playwright-bridge?logo=npm "vitest-playwright-bridge")](https://www.npmjs.com/package/vitest-playwright-bridge)

Bridge to interact with Playwright directly from Vitest browser tests, enabling advanced browser control and access to Playwright features. It provides utilities like `pageHandle`, which allow direct interaction with the Playwright [`Page`](https://playwright.dev/docs/api/class-page) object.

## Example

`test/media.test.ts` for [CSS media emulation](https://playwright.dev/docs/api/class-page#page-emulate-media):
```ts
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
})
```

## Configuration

`vitest.config.ts` example:
```ts
import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'
import { playwrightBridge } from 'vitest-playwright-bridge/plugin'

export default defineConfig({
  plugins: [playwrightBridge()],
  test: {
    browser: {
      provider: playwright(),
      enabled: true,
      instances: [
        { browser: 'chromium' },
      ],
    },
  },
})
```

## API

```ts
import { pageHandle, contextHandle, route, unroute, unrouteAll, bypassFetch } from 'vitest-playwright-bridge/browser'
```

### HostHandle
`HostHandle` is similar to [`JSHandle`](https://playwright.dev/docs/api/class-jshandle) in Playwright.

Just like we pass functions from Node to browsers via `JSHandle.evaluate` in Playwright, we can pass functions from browsers to Node via `HostHandle.evaluate` in this bridge.

The bridge provides two initial `HostHandle` instances:
- `pageHandle`: represents the current Playwright [`Page`](https://playwright.dev/docs/api/class-page) object.
- `contextHandle`: represents the current Playwright [`BrowserContext`](https://playwright.dev/docs/api/class-browsercontext) object.

### Network Routing
To support fast, flexible network request matching and routing, the bridge provides direct browser equivalents for Playwright's [`Page.route`](https://playwright.dev/docs/api/class-page#page-route).
- `route(url, handler)`: adds a route to match network requests.
- `unroute(url, handler?)`: removes a specific route or all routes matching the URL.
- `unrouteAll()`: removes all routes.

```ts
import { describe, test, expect } from 'vitest'
import { route, unrouteAll } from 'vitest-playwright-bridge/browser'

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
})
```

## License
MIT
