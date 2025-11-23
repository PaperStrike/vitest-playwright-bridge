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
    private readonly _id: string,
    private readonly _req: RouteRequest,
    private readonly _rpc: BridgeClientRpc,
  ) {}

  /** @internal */
  protected _handleResolve: ((done: boolean) => void) | null = null

  /**
   * @internal
   */
  public _startHandling() {
    return new Promise<boolean>((resolve) => {
      this._handleResolve = (done) => {
        this._handleResolve = null
        resolve(done)
      }
    })
  }

  private _assertNotHandled(): asserts this is { _handleResolve: object } {
    if (this._handleResolve === null) {
      throw new Error('Route is already handled!')
    }
  }

  /**
   * @internal
   */
  public _hasTriedButFailed = false

  private async _tryHandle(handleFn: () => Promise<void>) {
    this._assertNotHandled()
    try {
      await handleFn()
      this._handleResolve(true)
    }
    catch (e) {
      this._hasTriedButFailed = true
      throw e
    }
  }

  /**
   * @internal
   */
  public async _innerContinue() {
    const {
      postData,
      headers,
      method,
      url,
    } = this._req._fallbackOverridesForContinue()
    await this._rpc.routeContinue(this._id, {
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
    this._assertNotHandled()
    this._req._applyFallbackOverrides(options)
    this._handleResolve(false)
  }

  @hideInternals
  public async abort(errorCode?: string) {
    await this._tryHandle(() => (
      this._rpc.routeAbort(this._id, errorCode)
    ))
  }

  @hideInternals
  public async continue(options?: FallbackOverrides) {
    await this._tryHandle(async () => {
      this._req._applyFallbackOverrides(options)
      await this._innerContinue()
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
    await this._tryHandle(async () => {
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

      await this._rpc.routeFulfill(this._id, {
        body: fulfillBody,
        contentType: fulfillContentType,
        headers: fulfillHeaders,
        path,
        status: status ?? response?.status,
      })
    })
  }

  public request() {
    return this._req
  }
}
