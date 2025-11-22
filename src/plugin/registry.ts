import * as playwright from 'playwright'
import type { PlaywrightBridgePluginOptions } from './types'

const bridgeIdMap = new WeakMap<playwright.Page, string>()
const optionsMap = new WeakMap<playwright.Page, PlaywrightBridgePluginOptions>()

export const getBridgeId = (page: playwright.Page): string => {
  const existingId = bridgeIdMap.get(page)
  if (existingId) {
    return existingId
  }

  const newId = crypto.randomUUID()
  bridgeIdMap.set(page, newId)
  return newId
}

export const setOptionsForPage = (page: playwright.Page, options?: PlaywrightBridgePluginOptions): void => {
  if (options) {
    optionsMap.set(page, options)
  }
  else {
    optionsMap.delete(page)
  }
}

export const getOptionsForPage = (page: playwright.Page): PlaywrightBridgePluginOptions | undefined => {
  return optionsMap.get(page)
}
