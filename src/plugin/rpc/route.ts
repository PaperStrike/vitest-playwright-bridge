import type * as playwright from 'playwright'
import type { BridgeRouteServerMethods, RpcImpl } from '../../shared/types'
import { routeBypassFetchHeader } from '../../shared/utils'
import type { HandleController } from './handle'
import { getBridgeId, getOptionsForPage } from '../registry'
import type { BridgeServerRpc } from '../types'

const createRouteController = (
  page: playwright.Page,
  rpc: BridgeServerRpc,
  handleController: HandleController,
): RpcImpl<BridgeRouteServerMethods> => {
  const bridgeId = getBridgeId(page)
  const bridgeOptions = getOptionsForPage(page)

  const routes = new Map<string, playwright.Route>()

  const routeHandler = async (route: playwright.Route, request: playwright.Request) => {
    const headersArray = await request.headersArray()

    const bypassHeaderIndex = headersArray.findIndex(h => h.name === routeBypassFetchHeader && h.value === bridgeId)
    if (bypassHeaderIndex > 0) {
      headersArray.splice(bypassHeaderIndex, 1)

      const headers: Record<string, string> = {}
      for (const { name, value } of headersArray) {
        headers[name] = headers[name] ? `${headers[name]},${value}` : value
      }
      await route.continue({ headers })
      return
    }

    const bodyBuffer = request.postDataBuffer() as Buffer<ArrayBuffer> | null

    let frame: playwright.Frame | null
    try {
      frame = request.frame()
    }
    catch {
      frame = null
    }

    const sw = request.serviceWorker()

    const routeId = crypto.randomUUID()
    routes.set(routeId, route)

    try {
      await rpc.routeRequest(routeId, {
        body: bodyBuffer ? bodyBuffer.buffer : undefined,
        frame: frame ? handleController.createHandleFor(frame) : null,
        headersArray,
        isNavigationRequest: request.isNavigationRequest(),
        method: request.method(),
        resourceType: request.resourceType(),
        serviceWorker: sw ? handleController.createHandleFor(sw) : null,
        url: request.url(),
      })
    }
    catch {
      console.warn(`Failed to route request to ${request.url()}, continuing without routing.`)
    }
  }

  const getRouteOrThrow = (routeId: string) => {
    const route = routes.get(routeId)
    if (!route) {
      throw new Error('Route is already handled!')
    }
    return route
  }

  const convertBody = (body: string | ArrayBufferLike | ArrayBufferView): Buffer | string => {
    if (typeof body === 'string') {
      return body
    }
    if (ArrayBuffer.isView(body)) {
      return Buffer.from(body.buffer, body.byteOffset, body.byteLength)
    }
    return Buffer.from(body)
  }

  const routeTarget = bridgeOptions?.routeContext ? page.context() : page

  return {
    toggle: async (enabled) => {
      if (enabled) {
        await routeTarget.route('', routeHandler)
      }
      else {
        await routeTarget.unroute('', routeHandler)
      }
    },
    abort: async (routeId, errorCode) => {
      const route = getRouteOrThrow(routeId)
      await route.abort(errorCode)
      routes.delete(routeId)
    },
    continue: async (routeId, options) => {
      const route = getRouteOrThrow(routeId)
      const continueOptions: Parameters<typeof route.continue>[0] = {}
      if (options.headers !== undefined) continueOptions.headers = options.headers
      if (options.method !== undefined) continueOptions.method = options.method
      if (options.postData !== undefined) continueOptions.postData = convertBody(options.postData)
      if (options.url !== undefined) continueOptions.url = options.url
      await route.continue(continueOptions)
      routes.delete(routeId)
    },
    fulfill: async (routeId, options) => {
      const route = getRouteOrThrow(routeId)
      const fulfillOptions: Parameters<typeof route.fulfill>[0] = {}
      if (options.body !== undefined) fulfillOptions.body = convertBody(options.body)
      if (options.contentType !== undefined) fulfillOptions.contentType = options.contentType
      if (options.headers !== undefined) fulfillOptions.headers = options.headers
      if (options.path !== undefined) fulfillOptions.path = options.path
      if (options.status !== undefined) fulfillOptions.status = options.status
      await route.fulfill(fulfillOptions)
      routes.delete(routeId)
    },
  }
}

export default createRouteController
