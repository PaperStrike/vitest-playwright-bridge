import type * as playwright from 'playwright'
import type { BridgeRouteClientRequestDetails } from '../../shared/types'
import type { Unboxed } from '../../shared/serializer'
import HostHandle from '../handle'
import type { FallbackOverrides } from './Route'

interface SerializedFallbackOverrides {
  url?: string
  method?: string
  headers?: Record<string, string>
  postDataBuffer?: Uint8Array
}

const convertPostData = (postData: string | ArrayBuffer | ArrayBufferView): Uint8Array => {
  if (typeof postData === 'string') {
    return new TextEncoder().encode(postData)
  }
  else if (ArrayBuffer.isView(postData)) {
    return new Uint8Array(postData.buffer, postData.byteOffset, postData.byteLength)
  }
  else if (postData instanceof ArrayBuffer) {
    return new Uint8Array(postData)
  }

  throw new Error('Unsupported postData type')
}

export default class RouteRequest {
  /** @internal */
  public constructor(
    private readonly _requestDetails: Unboxed<BridgeRouteClientRequestDetails, HostHandle>,
  ) {
  }

  private _fallbackOverrides: SerializedFallbackOverrides = {}

  /**
   * @internal
   */
  public _applyFallbackOverrides(overrides: FallbackOverrides) {
    const { postData, ...restOverrides } = overrides
    this._fallbackOverrides = { ...this._fallbackOverrides, ...restOverrides }

    if (postData !== undefined) {
      this._fallbackOverrides.postDataBuffer = convertPostData(postData)
    }
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
    return new TextDecoder().decode(this._fallbackOverrides.postDataBuffer ?? this._requestDetails.bodyBuffer) || null
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

  public postDataBuffer(): Uint8Array | null {
    return this._fallbackOverrides.postDataBuffer ?? this._requestDetails.bodyBuffer ?? null
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
