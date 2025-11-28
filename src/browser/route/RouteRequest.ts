import type * as playwright from 'playwright'
import type { BridgeRouteClientRequestDetails } from '../../shared/types'
import type { Unboxed } from '../../shared/serializer'
import HostHandle from '../handle'
import type { FallbackOverrides } from './Route'

export default class RouteRequest {
  /** @internal */
  public constructor(
    private readonly _requestDetails: Unboxed<BridgeRouteClientRequestDetails, HostHandle>,
  ) {
  }

  private _fallbackOverrides: FallbackOverrides = {}

  /**
   * @internal
   */
  public _applyFallbackOverrides(overrides?: FallbackOverrides) {
    this._fallbackOverrides = { ...this._fallbackOverrides, ...overrides }
  }

  /**
   * @internal
   */
  public _fallbackOverridesForContinue() {
    return this._fallbackOverrides
  }

  private _cachedAllHeaders: Record<string, string> | undefined

  public allHeaders() {
    if (this._fallbackOverrides.headers) {
      return this._fallbackOverrides.headers
    }

    if (!this._cachedAllHeaders) {
      this._cachedAllHeaders = {}
      for (const { name, value } of this._requestDetails.headersArray) {
        const lowerName = name.toLowerCase()
        this._cachedAllHeaders[lowerName] = this._cachedAllHeaders[lowerName]
          ? `${this._cachedAllHeaders[lowerName]}, ${value}`
          : value
      }
    }

    return this._cachedAllHeaders
  }

  public frame() {
    if (this._requestDetails.frame === null) {
      throw new Error('Service Worker requests do not have an associated frame')
    }
    return this._requestDetails.frame as HostHandle<playwright.Frame>
  }

  public headerValue(name: string) {
    return this.allHeaders()[name.toLowerCase()]
  }

  public headersArray() {
    if (this._fallbackOverrides.headers) {
      return Object.entries(this._fallbackOverrides.headers)
        .map(([name, value]) => ({ name, value }))
    }

    return this._requestDetails.headersArray
  }

  public isNavigationRequest() {
    return this._requestDetails.isNavigationRequest
  }

  public method() {
    return this._fallbackOverrides.method ?? this._requestDetails.method
  }

  public postData(): string | null {
    const fallbackPostData = this._fallbackOverrides.postData
    if (fallbackPostData) {
      if (typeof fallbackPostData === 'string') return fallbackPostData
      return new TextDecoder().decode(fallbackPostData)
    }

    return this._requestDetails.body ? new TextDecoder().decode(this._requestDetails.body) : null
  }

  public postDataJSON(): object | null {
    const postData = this.postData()
    if (!postData) return null

    const contentType = this.headerValue('content-type')
    if (contentType === 'application/x-www-form-urlencoded') {
      const obj: Record<string, string> = {}
      const params = new URLSearchParams(postData)
      for (const [key, value] of params.entries()) {
        obj[key] = value
      }
      return obj
    }

    try {
      return JSON.parse(postData) as object | null
    }
    catch {
      throw new Error(`POST data is not a valid JSON object: ${postData}`)
    }
  }

  public postDataArrayBuffer(): ArrayBufferLike | null {
    const fallbackPostData = this._fallbackOverrides.postData
    if (fallbackPostData) {
      if (typeof fallbackPostData === 'string') {
        return new TextEncoder().encode(fallbackPostData).buffer
      }
      if (ArrayBuffer.isView(fallbackPostData)) {
        return fallbackPostData.buffer
      }
      return fallbackPostData
    }

    return this._requestDetails.body ?? null
  }

  public resourceType() {
    return this._requestDetails.resourceType
  }

  public serviceWorker() {
    if (this._requestDetails.serviceWorker === null) return null
    return this._requestDetails.serviceWorker as HostHandle<playwright.Worker>
  }

  public url() {
    return this._fallbackOverrides.url ?? this._requestDetails.url
  }
}
