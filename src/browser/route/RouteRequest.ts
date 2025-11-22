import type * as playwright from 'playwright'
import type { BridgeRouteClientRequestDetails } from '../../shared/types'
import type { Unboxed } from '../../shared/serializer'
import HostHandle from '../handle'
import type { FallbackOverrides } from './Route'

export default class RouteRequest {
  /** @internal */
  public constructor(
    private readonly requestDetails: Unboxed<BridgeRouteClientRequestDetails, HostHandle>,
  ) {
  }

  private fallbackOverrides: FallbackOverrides = {}

  /**
   * @internal
   */
  public applyFallbackOverrides(overrides?: FallbackOverrides) {
    this.fallbackOverrides = { ...this.fallbackOverrides, ...overrides }
  }

  /**
   * @internal
   */
  public fallbackOverridesForContinue() {
    return this.fallbackOverrides
  }

  private cachedAllHeaders: Record<string, string> | undefined

  public allHeaders() {
    if (this.fallbackOverrides.headers) {
      return this.fallbackOverrides.headers
    }

    if (!this.cachedAllHeaders) {
      this.cachedAllHeaders = {}
      for (const { name, value } of this.requestDetails.headersArray) {
        const lowerName = name.toLowerCase()
        this.cachedAllHeaders[lowerName] = this.cachedAllHeaders[lowerName]
          ? `${this.cachedAllHeaders[lowerName]},${value}`
          : value
      }
    }

    return this.cachedAllHeaders
  }

  public frame() {
    if (this.requestDetails.frame === null) {
      throw new Error('Service Worker requests do not have an associated frame')
    }
    return this.requestDetails.frame as HostHandle<playwright.Frame>
  }

  public headerValue(name: string) {
    return this.allHeaders()[name.toLowerCase()]
  }

  public headersArray() {
    if (this.fallbackOverrides.headers) {
      return Object.entries(this.fallbackOverrides.headers)
        .map(([name, value]) => ({ name, value }))
    }

    return this.requestDetails.headersArray
  }

  public isNavigationRequest() {
    return this.requestDetails.isNavigationRequest
  }

  public method() {
    return this.fallbackOverrides.method ?? this.requestDetails.method
  }

  public postData(): string | null {
    const fallbackPostData = this.fallbackOverrides.postData
    if (fallbackPostData) {
      if (typeof fallbackPostData === 'string') return fallbackPostData
      return new TextDecoder().decode(fallbackPostData)
    }

    return this.requestDetails.body ? new TextDecoder().decode(this.requestDetails.body) : null
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
    const fallbackPostData = this.fallbackOverrides.postData
    if (fallbackPostData) {
      if (typeof fallbackPostData === 'string') {
        return new TextEncoder().encode(fallbackPostData).buffer
      }
      if (ArrayBuffer.isView(fallbackPostData)) {
        return fallbackPostData.buffer
      }
      return fallbackPostData
    }

    return this.requestDetails.body ?? null
  }

  public resourceType() {
    return this.requestDetails.resourceType
  }

  public serviceWorker() {
    if (this.requestDetails.serviceWorker === null) return null
    return this.requestDetails.serviceWorker as HostHandle<playwright.Worker>
  }

  public url() {
    return this.fallbackOverrides.url ?? this.requestDetails.url
  }
}
