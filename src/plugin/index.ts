import type { Expression } from 'estree'
import { walk } from 'estree-walker'
import MagicString from 'magic-string'
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
  // Transform .evaluate()/evaluateHandle() calls with dynamic imports inside
  // to avoid vitest wrapping the dynamic import calls, which would break them.
  transform(code, id) {
    if (!/\.\s*evaluate(Handle)?\s*\(/.test(code)
      || !/\bimport\s*\(/.test(code)) {
      return
    }

    let ast
    try {
      ast = this.parse(code)
    }
    catch {
      return
    }

    const s = new MagicString(code)

    walk(ast, {
      enter(node) {
        if (node.type !== 'CallExpression') return
        if (node.callee.type !== 'MemberExpression') return

        const { property } = node.callee
        if (property.type !== 'Identifier') return
        if (property.name !== 'evaluate' && property.name !== 'evaluateHandle') return

        const firstArg = node.arguments[0] as (Expression & { start: number, end: number }) | undefined
        if (!firstArg) return
        if (firstArg.type !== 'ArrowFunctionExpression' && firstArg.type !== 'FunctionExpression') return

        let hasDynamicImport = false as boolean
        walk(firstArg, {
          enter(child) {
            if (child.type === 'ImportExpression') {
              hasDynamicImport = true
              this.skip()
            }
          },
        })

        if (hasDynamicImport) {
          const funcCode = code.slice(firstArg.start, firstArg.end)
          s.overwrite(firstArg.start, firstArg.end, JSON.stringify(funcCode))
        }
      },
    })

    if (s.hasChanged()) {
      return {
        code: s.toString(),
        map: s.generateMap({ hires: 'boundary', source: id }),
      }
    }
  },
})
