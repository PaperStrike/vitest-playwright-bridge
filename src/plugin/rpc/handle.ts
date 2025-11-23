import type * as playwright from 'playwright'
import type { BridgeHandleServerMethods, RpcImpl } from '../../shared/types'
import { parseExpression, PendingHandle } from '../../shared/serializer'
import { getCommonHandleIds } from '../../shared/utils'
import { getBridgeId } from '../registry'

export type HandleController = ReturnType<typeof createHandleController>

const createHandleController = (page: playwright.Page) => {
  const targetMap = new Map<string, unknown>()
  const createHandleFor = (value: unknown) => {
    const handleId = crypto.randomUUID()
    targetMap.set(handleId, value)
    return new PendingHandle(handleId)
  }

  const bridgeId = getBridgeId(page)

  // Pre-create common handles
  const commonHandleIds = getCommonHandleIds(bridgeId)
  targetMap.set(commonHandleIds.page, page)
  targetMap.set(commonHandleIds.context, page.context())

  const getTargetOrThrow = (handleId: string) => {
    const target = targetMap.get(handleId)
    if (!target) {
      throw new Error(`Handle with id ${handleId} does not exist`)
    }
    return target
  }

  const methods: RpcImpl<BridgeHandleServerMethods> = {
    dispose: (handleId) => {
      getTargetOrThrow(handleId)
      targetMap.delete(handleId)
    },
    evaluate: async (handleId, expr, arg) => {
      const target = getTargetOrThrow(handleId)
      const exprResult = parseExpression(expr)
      const result: unknown = await (
        typeof exprResult === 'function'
          ? (exprResult as (target: unknown, arg: unknown) => unknown)(target, arg)
          : exprResult
      )
      return result
    },
    evaluateHandle: async (handleId, expr, arg) => {
      const result = await methods.evaluate(handleId, expr, arg)
      return createHandleFor(result)
    },
    getProperties: (handleId) => {
      const target = getTargetOrThrow(handleId) as Record<string, unknown>
      const properties = new Map<string, PendingHandle>()
      for (const [key, value] of Object.entries(target)) {
        properties.set(key, createHandleFor(value))
      }
      return properties
    },
    getProperty: (handleId, propertyName) => {
      const target = getTargetOrThrow(handleId) as Record<string, unknown>
      const propertyValue = target[propertyName]
      return createHandleFor(propertyValue)
    },
    jsonValue: (handleId) => {
      const target = getTargetOrThrow(handleId)
      return target
    },
  }

  return {
    ...methods,
    createHandleFor,
    targetMap,
  }
}

export default createHandleController
