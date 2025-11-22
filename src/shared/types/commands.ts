import type {} from 'vitest/browser'

export type BridgeRegisterBrowserCommand = () => Promise<string>

/**
 * It won't work if we use `__vitest` prefix
 *
 * #TODO: find the source code of vitest filtering out commands starting with `__vitest`?
 */
export interface BridgeBrowserCommands {
  __playwrightBridge_register: BridgeRegisterBrowserCommand
}

declare module 'vitest/browser' {
  interface BrowserCommands extends BridgeBrowserCommands {}
}
