export abstract class Handle<_T = unknown> {
  /**
   * Fake field to make sure Handle is not structurally compatible with other types.
   */
  declare public readonly __ts_unique_marker: 'vite-playwright-bridge Handle'

  /** @internal */
  public constructor(
    /** @internal */
    public readonly id: string,
  ) {}
}

/** A handle that is pending creation on the other side. */
export class PendingHandle<_T = unknown> {
  /**
   * Fake field to make sure PendingHandle is not structurally compatible with other types.
   */
  declare public readonly __ts_unique_marker: 'vite-playwright-bridge PendingHandle'

  /** @internal */
  public constructor(
    /** @internal */
    public readonly id: string,
  ) {}
}
