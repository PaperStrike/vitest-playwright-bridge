import { createBirpc } from 'birpc'
import * as playwright from 'playwright'
import createHandleController from './handle'
import createRouteController from './route'
import { deserialize, serialize, type SerializableValue } from '../../shared/serializer'
import type { BridgeServerRpc } from '../types'

export const createServerRpc = (
  page: playwright.Page,
  wsRoute: playwright.WebSocketRoute,
) => {
  const handleController = createHandleController(page)

  const birpc: BridgeServerRpc = createBirpc(
    {
      handleDispose: handleController.dispose,
      handleEvaluate: handleController.evaluate,
      handleEvaluateHandle: handleController.evaluateHandle,
      handleGetProperties: handleController.getProperties,
      handleGetProperty: handleController.getProperty,
      handleJsonValue: handleController.jsonValue,

      routeAbort: (...args) => routeController.abort(...args),
      routeContinue: (...args) => routeController.continue(...args),
      routeFulfill: (...args) => routeController.fulfill(...args),
      routeToggle: (...args) => routeController.toggle(...args),
    },
    {
      post: (msg: Buffer) => { wsRoute.send(msg) },
      on: (cb) => { wsRoute.onMessage(cb) },
      serialize: (msg: unknown) => serialize(msg as SerializableValue, { useNullFallback: true }),
      deserialize: (buffer: Uint8Array) => deserialize(buffer, { targetMap: handleController.targetMap }),
      timeout: -1,
    },
  )

  const routeController = createRouteController(page, birpc, handleController)

  wsRoute.onClose(() => {
    birpc.$close()
  })

  return birpc
}
