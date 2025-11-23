import type { Unboxed } from '../../shared/serializer'
import type { BridgeRouteClientRequestDetails } from '../../shared/types'
import { hideInternals, routeBypassFetchHeader } from '../../shared/utils'
import type HostHandle from '../handle'
import type { BridgeClientRpc } from '../types'
import Route from './Route'
import RouteHandler, { type RouteMatcher, type RouteHandlerCallback, type RouteOptions } from './RouteHandler'
import RouteRequest from './RouteRequest'

export type {
  Route,
  RouteHandler,
  RouteRequest,
  RouteMatcher,
  RouteHandlerCallback,
  RouteOptions,
}

export interface UnrouteAllOptions {
  behavior?: 'default' | 'wait' | 'ignoreErrors'
}

export interface RouteController {
  addRoute: (url: RouteMatcher, handler: RouteHandlerCallback, options?: RouteOptions) => Promise<void>
  removeRoute: (url: RouteMatcher, handler?: RouteHandlerCallback) => Promise<void>
  removeAllRoutes: (options?: UnrouteAllOptions) => Promise<void>
  bypassFetch: (...fetchArgs: Parameters<typeof fetch>) => Promise<Response>
  handleRouteRequest: (routeId: string, details: Unboxed<BridgeRouteClientRequestDetails, HostHandle>) => Promise<void>
}

const createRouteController = (rpc: BridgeClientRpc, bridgeId: string): RouteController => {
  let routes: RouteHandler[] = []

  return {
    addRoute: hideInternals(async (url, handler, options = {}) => {
      const routeHandler = new RouteHandler(url, handler, options)
      routes.unshift(routeHandler)
      if (routes.length === 1) {
        await rpc.routeToggle(true)
      }
    }),
    removeRoute: hideInternals(async (url, handler) => {
      if (handler !== undefined) {
        routes = routes.filter(r => r.url !== url || r.handler !== handler)
      }
      else {
        routes = routes.filter(r => r.url !== url)
      }
      if (routes.length === 0) {
        await rpc.routeToggle(false)
      }
    }),
    removeAllRoutes: hideInternals(async (options = {}) => {
      const { behavior } = options
      routes = []
      if (behavior && behavior !== 'default') {
        const stopPromises = routes.map(r => r.stop(behavior))
        await Promise.all(stopPromises)
      }
      await rpc.routeToggle(false)
    }),
    bypassFetch: hideInternals((...fetchArgs) => {
      const request = new Request(...fetchArgs)
      request.headers.append(routeBypassFetchHeader, bridgeId)
      return fetch(request)
    }),
    /**
     * Called by server. No need to hideInternals
     */
    handleRouteRequest: async (routeId, details) => {
      const routeRequest = new RouteRequest(details)
      const route = new Route(routeId, routeRequest, rpc)
      const requestUrl = new URL(details.url, window.location.origin)
      const handlers = routes.filter(r => r.matches(requestUrl))

      for (const handler of handlers) {
        // Requests come concurrently, so it's possible that
        // a handler expired while we await the previous ones.
        const index = routes.indexOf(handler)
        if (index < 0) {
          continue
        }

        if (handler.willExpire()) {
          routes.splice(index, 1)
        }

        let handled = false
        try {
          handled = await handler.handle(route, routeRequest)
        }
        catch (e) {
          // Abort the request to avoid hanging.
          rpc.routeAbort(routeId).catch((err: unknown) => {
            console.error('Error aborting route after handler error', routeId, err)
          })

          // TODO fail the relevant test. mark the test that added the handler,
          // draft a feature request to vitest to support externally failing it?
          reportError(e)
        }

        if (routes.length === 0) {
          rpc.routeToggle(false).catch((e: unknown) => {
            console.error('Failed to toggle route off after all handlers expired', e)
          })
        }

        if (handled) {
          return
        }
      }

      // No matching handler, or every handler called fallback().
      await route._innerContinue()
    },
  }
}

export default createRouteController
