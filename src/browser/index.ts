import type * as playwright from 'playwright'
import { commands } from 'vitest/browser'
import { createBirpc } from 'birpc'
import { serialize, deserialize, type SerializableValue } from '../shared/serializer'
import { getBridgeWebSocketPath, getCommonHandleIds } from '../shared/utils'
import HostHandle from './handle'
import createRouteController, { type Route, type RouteHandlerCallback, type RouteMatcher, type RouteOptions, type UnrouteAllOptions } from './route'
import type { BridgeClientRpc } from './types'

export type {
  HostHandle,
  Route,
  RouteHandlerCallback,
  RouteMatcher,
  RouteOptions,
  UnrouteAllOptions,
}

const createClient = async () => {
  const bridgeId = await commands.__playwrightBridge_register()
  const ws = new WebSocket(`wss://${window.location.host}/${getBridgeWebSocketPath(bridgeId)}`)
  ws.binaryType = 'arraybuffer'

  const rpc: BridgeClientRpc = createBirpc({
    routeRequest: (id, details) => {
      return routeController.handleRouteRequest(id, details)
    },
  }, {
    post: (msg: Uint8Array) => {
      ws.send(msg)
    },
    on: (cb) => {
      ws.addEventListener('message', (event) => {
        cb(event.data)
      })
    },
    serialize: (data: unknown) => serialize(data as SerializableValue),
    deserialize: (data: Uint8Array) => deserialize(data, { createHandle }),
    timeout: -1,
  })

  const routeController = createRouteController(rpc, bridgeId)
  const createHandle = (id: string) => new HostHandle(id, rpc)
  const createPersistentHandle = <T>(id: string) => new HostHandle<T>(id, rpc, true)

  if (ws.readyState === WebSocket.CONNECTING) {
    await new Promise<void>((resolve, reject) => {
      const ac = new AbortController()
      ws.addEventListener('open', () => {
        ac.abort()
        resolve()
      }, { signal: ac.signal })
      ws.addEventListener('error', () => {
        ac.abort()
        reject(new Error('Failed to connect to bridge WebSocket'))
      }, { signal: ac.signal })
    })
  }

  const commonHandleIds = getCommonHandleIds(bridgeId)
  const pageHandle = createPersistentHandle<playwright.Page>(commonHandleIds.page)
  const contextHandle = createPersistentHandle<playwright.BrowserContext>(commonHandleIds.context)

  return {
    rpc,
    routeController,
    pageHandle,
    contextHandle,
  }
}

const client = await createClient()

export const route = client.routeController.addRoute
export const unroute = client.routeController.removeRoute
export const unrouteAll = client.routeController.removeAllRoutes
export const bypassFetch = client.routeController.bypassFetch

export const pageHandle = client.pageHandle
export const contextHandle = client.contextHandle
