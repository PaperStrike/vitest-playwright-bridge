import globToRegex from '../../shared/globToRegex'
import type Route from './Route'
import type RouteRequest from './RouteRequest'

export type RouteMatcher = string | RegExp | ((url: URL) => boolean)
export type RouteHandlerCallback = (route: Route, request: RouteRequest) => void | PromiseLike<void>
export interface RouteOptions {
  times?: number
}

/**
 * For performance, the client chains multiple handlers while the server uses a single catch-all handler.
 * If matching or chaining logic grows too complex, consider switching to one-to-one handler mappings.
 *
 * This should be internal but tsup complains about missing exports so we instead marked the constructor as internal.
 * https://github.com/egoist/tsup/issues/1072
 */
export default class RouteHandler {
  private _handledCount = 0

  private readonly _maxHandleCount: number

  private readonly _matcher: (url: URL) => boolean

  /** @internal */
  public constructor(
    public readonly url: RouteMatcher,
    public readonly handler: RouteHandlerCallback,
    options: RouteOptions = {},
  ) {
    this._matcher = RouteHandler._createMatcher(this.url)
    this._maxHandleCount = options.times ?? Infinity
  }

  /**
   * `urlMatches` in playwright/urlMatch.ts
   * @see {@link https://github.com/microsoft/playwright/blob/14212c8728458334847c7620860156a239fb0ab8/packages/playwright-core/src/utils/isomorphic/urlMatch.ts#L93}
   */
  private static _createMatcher(url: RouteMatcher): (url: URL) => boolean {
    if (url === '') {
      return () => true
    }
    if (typeof url === 'string') {
      const parsedRegex = globToRegex((
        url.startsWith('*') ? url : new URL(url, window.location.origin).href
      ))
      return ({ href }: URL) => parsedRegex.test(href)
    }
    if (url instanceof RegExp) {
      return ({ href }: URL) => url.test(href)
    }
    if (typeof url === 'function') {
      return url
    }
    throw new Error('url parameter should be string, RegExp or function')
  }

  /**
   * Not "expired" to avoid handler callback errors affecting related algorithm
   */
  public willExpire() {
    return this._handledCount + 1 >= this._maxHandleCount
  }

  public matches(url: URL) {
    return this._matcher(url)
  }

  private _ignoreErrors = false

  private _activeInvocationSet = new Set<{ route: Route, complete: Promise<boolean> }>()

  public async stop(behavior: 'wait' | 'ignoreErrors') {
    if (behavior === 'ignoreErrors') {
      this._ignoreErrors = true
      return
    }

    const waitTargets: Promise<unknown>[] = []
    for (const invocation of this._activeInvocationSet) {
      if (!invocation.route._hasTriedButFailed) {
        waitTargets.push(invocation.complete)
      }
    }

    await Promise.all(waitTargets)
  }

  public async handle(route: Route, request: RouteRequest): Promise<boolean> {
    this._handledCount += 1
    const handlePromise = route._startHandling()
    const invocation = { route, complete: handlePromise }
    this._activeInvocationSet.add(invocation)
    try {
      const [handled] = await Promise.all([
        handlePromise,
        this.handler.call(null, route, request),
      ])
      return handled
    }
    catch (e) {
      if (this._ignoreErrors) {
        return false
      }
      throw e
    }
    finally {
      this._activeInvocationSet.delete(invocation)
    }
  }
}
