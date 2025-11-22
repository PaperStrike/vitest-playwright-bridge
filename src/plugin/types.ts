import type { BrowserCommand } from 'vitest/node'
import type {} from '@vitest/browser-playwright'
import type { BirpcReturn } from 'birpc'
import type { BridgeClientMethods, BridgeServerMethods, RpcImpl, RpcPeer } from '../shared/types'

export interface PlaywrightBridgePluginOptions {
  /**
   * If enabled, the bridge will use [`context.route`](https://playwright.dev/docs/api/class-browsercontext#browser-context-route) to route requests.
   * By default, the bridge uses [`page.route`](https://playwright.dev/docs/api/class-page#page-route).
   */
  routeContext?: boolean
}

export type BrowserCommandImpl<T>
  = T extends (...args: infer A) => infer R
    ? BrowserCommand<A, R extends Promise<infer U> ? U : R>
    : never

export type BrowserCommandsImpl<T>
  = {
    [K in keyof T]: BrowserCommandImpl<T[K]>
  }

export type BridgeServerRpc = BirpcReturn<RpcPeer<BridgeClientMethods>, RpcImpl<BridgeServerMethods>>
