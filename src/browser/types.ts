import type { BirpcReturn } from 'birpc'
import type { BridgeClientMethods, BridgeServerMethods, RpcImpl, RpcPeer } from '../shared/types'
import type HostHandle from './handle'

export type BridgeClientRpc = BirpcReturn<RpcPeer<BridgeServerMethods, HostHandle>, RpcImpl<BridgeClientMethods, HostHandle>>
