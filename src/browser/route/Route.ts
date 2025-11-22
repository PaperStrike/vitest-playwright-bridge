import { hideInternals } from '../../shared/utils'
import type { BridgeClientRpc } from '../types'
import type RouteRequest from './RouteRequest'

export interface FallbackOverrides {
  url?: string
  method?: string
  headers?: Record<string, string>
  postData?: string | ArrayBuffer | ArrayBufferView
}

export default class Route {
  /** @internal */
  public constructor(
    private readonly id: string,
    private readonly req: RouteRequest,
    private readonly rpc: BridgeClientRpc,
  ) {}

  /** @internal */
  protected handleResolve: ((done: boolean) => void) | null = null

  /**
   * @internal
   */
  public startHandling() {
    return new Promise<boolean>((resolve) => {
      this.handleResolve = (done) => {
        this.handleResolve = null
        resolve(done)
      }
    })
  }

  private assertNotHandled(): asserts this is { handleResolve: object } {
    if (this.handleResolve === null) {
      throw new Error('Route is already handled!')
    }
  }

  /**
   * @internal
   */
  public hasTriedButFailed = false

  private async tryHandle(handleFn: () => Promise<void>) {
    this.assertNotHandled()
    try {
      await handleFn()
      this.handleResolve(true)
    }
    catch (e) {
      this.hasTriedButFailed = true
      throw e
    }
  }

  /**
   * @internal
   */
  public async innerContinue() {
    const {
      postData,
      headers,
      method,
      url,
    } = this.req.fallbackOverridesForContinue()
    await this.rpc.routeContinue(this.id, {
      headers,
      method,
      postData,
      url,
    })
  }

  @hideInternals
  // Intentional async to match playwright's API and retain future compatibility
  // eslint-disable-next-line @typescript-eslint/require-await
  public async fallback(options?: FallbackOverrides) {
    this.assertNotHandled()
    this.req.applyFallbackOverrides(options)
    this.handleResolve(false)
  }

  @hideInternals
  public async abort(errorCode?: string) {
    await this.tryHandle(() => (
      this.rpc.routeAbort(this.id, errorCode)
    ))
  }

  @hideInternals
  public async continue(options?: FallbackOverrides) {
    await this.tryHandle(async () => {
      this.req.applyFallbackOverrides(options)
      await this.innerContinue()
    })
  }

  @hideInternals
  public async fulfill({
    body,
    contentType,
    headers,
    json,
    path,
    response,
    status,
  }: {
    body?: string | ArrayBufferLike | ArrayBufferView | null
    contentType?: string
    headers?: Record<string, string>
    json?: unknown
    path?: string
    response?: Response
    status?: number
  } = {}) {
    await this.tryHandle(async () => {
      let fulfillBody
      if (json !== undefined) {
        if (body !== undefined) {
          throw new Error('Can specify either body or json parameters')
        }
        fulfillBody = JSON.stringify(json)
      }
      else {
        fulfillBody = body
      }

      if (fulfillBody === undefined) {
        const responseAB = await response?.clone().arrayBuffer()
        if (responseAB && responseAB.byteLength > 0) {
          fulfillBody = responseAB
        }
      }

      let fulfillContentType = contentType
      if (fulfillContentType === undefined && json !== undefined) {
        fulfillContentType = 'application/json'
      }

      if (fulfillBody === null) {
        fulfillBody = undefined
      }

      let fulfillHeaders = headers
      if (fulfillHeaders === undefined && response) {
        fulfillHeaders = {}
        for (const [key, value] of response.headers) {
          fulfillHeaders[key] = fulfillHeaders[key] ? `${fulfillHeaders[key]},${value}` : value
        }
      }

      await this.rpc.routeFulfill(this.id, {
        body: fulfillBody,
        contentType: fulfillContentType,
        headers: fulfillHeaders,
        path,
        status: status ?? response?.status,
      })
    })
  }

  public request() {
    return this.req
  }
}
