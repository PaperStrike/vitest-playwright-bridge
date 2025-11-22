import type { BridgeBrowserCommands } from '../../shared/types'

import type { BrowserCommandsImpl } from '../types'
import register from './register'

const commands: BrowserCommandsImpl<BridgeBrowserCommands> = {
  __playwrightBridge_register: register,
}

export default commands
