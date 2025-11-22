import type { BridgeRegisterBrowserCommand } from '../../shared/types'
import { getBridgeId } from '../registry'
import type { BrowserCommandImpl } from '../types'

const register: BrowserCommandImpl<BridgeRegisterBrowserCommand> = ({ page }) => {
  const bridgeId = getBridgeId(page)
  return bridgeId
}

export default register
