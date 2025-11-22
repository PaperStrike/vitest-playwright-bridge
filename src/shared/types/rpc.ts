import type * as playwright from 'playwright'
import type { Handle, PendingHandle, Unboxed } from '../serializer'

export interface BridgeHandleServerMethods {
  dispose: (handleId: string) => void
  evaluate: (handleId: string, expr: string, arg: unknown) => unknown
  evaluateHandle: (handleId: string, expr: string, arg: unknown) => PendingHandle
  getProperties: (handleId: string) => Map<string, PendingHandle>
  getProperty: (handleId: string, propertyName: string) => PendingHandle
  jsonValue: (handleId: string) => unknown
}

export interface BridgeRouteServerMethods {
  toggle: (enabled: boolean) => void
  abort: (requestId: string, errorCode?: string) => void
  continue: (requestId: string, options: {
    headers?: Record<string, string> | undefined
    method?: string | undefined
    postData?: string | ArrayBufferLike | ArrayBufferView | undefined
    url?: string | undefined
  }) => void
  fulfill: (requestId: string, options: {
    body?: string | ArrayBufferLike | ArrayBufferView | undefined
    contentType?: string | undefined
    headers?: Record<string, string> | undefined
    path?: string | undefined
    status?: number | undefined
  }) => void
}

export type BridgeServerMethods
  = & {
    [K in keyof BridgeHandleServerMethods as `handle${Capitalize<K>}`]: BridgeHandleServerMethods[K]
  } & {
    [K in keyof BridgeRouteServerMethods as `route${Capitalize<K>}`]: BridgeRouteServerMethods[K]
  }

export interface BridgeRouteClientRequestDetails {
  body?: ArrayBuffer | undefined
  frame: PendingHandle<playwright.Frame> | null
  headersArray: { name: string, value: string }[]
  isNavigationRequest: boolean
  method: string
  resourceType: string
  serviceWorker: PendingHandle<playwright.Worker> | null
  url: string
}

export interface BridgeRouteClientMethods {
  request: (requestId: string, details: BridgeRouteClientRequestDetails) => void
}

export type BridgeClientMethods = {
  [K in keyof BridgeRouteClientMethods as `route${Capitalize<K>}`]: BridgeRouteClientMethods[K]
}

export type RpcImpl<T extends Record<keyof T, (...args: never) => unknown>, H extends Handle = never> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: Unboxed<A, H>) => R | PromiseLike<R>
    : never;
}

export type RpcPeer<T extends Record<keyof T, (...args: never) => unknown>, H extends Handle = never> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => (R extends PromiseLike<infer PR> ? PromiseLike<Unboxed<PR, H>> : Unboxed<R, H>)
    : never;
}
