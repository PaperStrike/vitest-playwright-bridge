export const getBridgeWebSocketPath = (bridgeId: string) => {
  return `__vitest_playwright_bridge__?bridgeId=${bridgeId}`
}

export const routeBypassFetchHeader = 'x-vitest-playwright-bridge-route-bypass'

export const getCommonHandleIds = (bridgeId: string) => {
  return {
    page: `page-${bridgeId}`,
    context: `context-${bridgeId}`,
  }
}

/**
 * Remove internal stack frames from errors thrown by the wrapped function,
 * stopping at the next public caller.
 *
 * __Note__: For simplicity, in nested calls, only frames from the
 * immediate internal function are removed.
 */
export const hideInternals = <This, Args extends unknown[], R>(
  target: (this: This, ...args: Args) => Promise<R>,
) => {
  return async function boundary(this: This, ...args: Args): Promise<R> {
    try {
      return await target.apply(this, args)
    }
    catch (error) {
      if (error instanceof Error) {
        Error.captureStackTrace(error, boundary)
      }
      throw error
    }
  }
}
