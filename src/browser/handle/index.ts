import { Handle, type Unboxed } from '../../shared/serializer'
import { hideInternals } from '../../shared/utils'
import type { BridgeClientRpc } from '../types'

const finalizationRegistry = new FinalizationRegistry<{
  id: string
  rpc: BridgeClientRpc
}>(({ id, rpc }) => {
  rpc.handleDispose(id).catch((err: unknown) => {
    console.error('Error disposing remote handle on finalization', id, err)
  })
})

export type NodeFunctionOn<On, Arg2, R>
  = string | ((on: On, arg2: Unboxed<Arg2, HostHandle>) => R | Promise<R>)

export default class HostHandle<T = unknown> extends Handle {
  /** @internal */
  public constructor(
    id: string,
    private readonly rpc: BridgeClientRpc,
    private readonly persist = false,
  ) {
    super(id)

    finalizationRegistry.register(this, { id, rpc }, this)
  }

  public evaluate<R, Arg, O extends T = T>(nodeFunction: NodeFunctionOn<O, Arg, R>, arg: Arg): Promise<R>
  public evaluate<R, O extends T = T>(nodeFunction: NodeFunctionOn<O, void, R>, arg?: unknown): Promise<R>

  @hideInternals
  public evaluate<R, Arg, O>(nodeFunction: NodeFunctionOn<O, Arg, R>, arg: Arg) {
    return this.rpc
      .handleEvaluate(
        this.id,
        String(nodeFunction),
        arg,
      )
  }

  public evaluateHandle<R, Arg, O extends T = T>(
    nodeFunction: NodeFunctionOn<O, Arg, R>,
    arg: Arg,
  ): Promise<HostHandle<R>>
  public evaluateHandle<R, O extends T = T>(
    nodeFunction: NodeFunctionOn<O, void, R>,
    arg?: unknown,
  ): Promise<HostHandle<R>>

  @hideInternals
  public evaluateHandle<R, Arg, O>(nodeFunction: NodeFunctionOn<O, Arg, R>, arg: Arg) {
    return this.rpc.handleEvaluateHandle(
      this.id,
      String(nodeFunction),
      arg,
    )
  }

  @hideInternals
  public async jsonValue(): Promise<T> {
    return await this.rpc.handleJsonValue(this.id) as T
  }

  private disposed = false

  @hideInternals
  public async dispose(): Promise<void> {
    if (this.disposed || this.persist) return
    await this.rpc.handleDispose(this.id)
    finalizationRegistry.unregister(this)
    this.disposed = true
  }

  @hideInternals
  public getProperties(): Promise<Map<string, HostHandle>> {
    return this.rpc.handleGetProperties(this.id)
  }

  @hideInternals
  public getProperty(propertyName: string): Promise<HostHandle> {
    return this.rpc.handleGetProperty(this.id, propertyName)
  }
}
