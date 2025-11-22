/**
 * APIs that are common to Node.js and the browser.
 *
 * Better if a lib provides these types.
 *
 * https://github.com/microsoft/TypeScript-DOM-lib-generator/issues/1402
 */

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

declare global {
  interface ErrorConstructor {
    captureStackTrace(targetObject: object, constructorOpt?: Function): void
  }

  interface URL {
    hash: string
    host: string
    hostname: string
    href: string
    readonly origin: string
    password: string
    pathname: string
    port: string
    protocol: string
    search: string
    readonly searchParams: URLSearchParams
    username: string
    toString(): string
    toJSON(): string
  }

  interface URLConstructor {
    new(input: string, base?: string | URL): URL
    createObjectURL(object: Blob): string
    revokeObjectURL(url: string): void
    readonly prototype: URL
  }

  const URL: URLConstructor
}

export {}
