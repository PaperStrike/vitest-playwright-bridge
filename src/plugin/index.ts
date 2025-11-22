import type * as playwright from 'playwright'
import type { Plugin } from 'vitest/config'
import type { PlaywrightBrowserProvider } from '@vitest/browser-playwright'
import { getBridgeWebSocketPath } from '../shared/utils'
import commands from './commands'
import { getBridgeId, setOptionsForPage } from './registry'
import { createServerRpc } from './rpc'
import type { BridgeServerRpc, PlaywrightBridgePluginOptions } from './types'

export type { PlaywrightBridgePluginOptions }

export const playwrightBridge = (options?: PlaywrightBridgePluginOptions): Plugin => ({
  name: 'vitest-playwright-bridge',
  config() {
    return {
      test: {
        browser: {
          commands,
        },
      },
    }
  },
  configureVitest(vitestContext) {
    const providerOption = vitestContext.vitest.config.browser.provider
    if (providerOption?.name !== 'playwright') {
      throw new Error('vitest-playwright-bridge can only be used with @vitest/browser-playwright')
    }

    const routedPages = new WeakSet<playwright.Page>()
    const rpcMap = new WeakMap<playwright.Page, BridgeServerRpc>()

    // Patch the Playwright provider to route WebSocket connections for our bridge.
    // Commands API can't do this because Playwright WebSocket routes only trigger on new navigation.
    // Vitest runs tests in iframes, and iframe creation counts as navigation, so this works.
    const originalProviderFactory = providerOption.providerFactory
    providerOption.providerFactory = (...factoryArgs) => {
      const provider = originalProviderFactory(...factoryArgs) as PlaywrightBrowserProvider

      const originalOpenPage = provider.openPage.bind(provider)
      provider.openPage = async (sessionId, ...rest) => {
        await originalOpenPage(sessionId, ...rest)

        const page = provider.getPage(sessionId)
        if (routedPages.has(page)) return
        routedPages.add(page)

        const bridgeId = getBridgeId(page)
        setOptionsForPage(page, options)

        await page.routeWebSocket(`**/${getBridgeWebSocketPath(bridgeId)}`, (wsRoute) => {
          if (rpcMap.has(page)) {
            // TODO check if vitest multiple sessions share the same page instance
            throw new Error('Bridge RPC already exists')
          }

          const rpc = createServerRpc(page, wsRoute)
          rpcMap.set(page, rpc)

          wsRoute.onClose(() => {
            rpcMap.delete(page)
          })
        })
      }

      return provider
    }
  },
})
