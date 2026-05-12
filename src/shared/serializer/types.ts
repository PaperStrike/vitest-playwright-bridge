import type { Handle, PendingHandle } from './Handle'

export type SerializableValue
  = | number | boolean | string | null | undefined | bigint | URL | Date | Error | RegExp | Handle | PendingHandle
    | Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array | BigInt64Array | BigUint64Array
    | Set<SerializableValue> | Map<SerializableValue, SerializableValue>
    | SerializableValue[] | { [K: string]: SerializableValue }

export type Unboxed<Arg, NewHandle extends Handle = never>
  = Arg extends Handle<infer T>
    ? T
    : Arg extends PendingHandle
      ? NewHandle
      : Arg extends URL
        ? URL
        : Arg extends Date
          ? Date
          : Arg extends RegExp
            ? RegExp
            : Arg extends Error
              ? Error
              : Arg extends Int8Array
                ? Int8Array<ArrayBuffer>
                : Arg extends Uint8Array
                  ? Uint8Array<ArrayBuffer>
                  : Arg extends Uint8ClampedArray
                    ? Uint8ClampedArray<ArrayBuffer>
                    : Arg extends Int16Array
                      ? Int16Array<ArrayBuffer>
                      : Arg extends Uint16Array
                        ? Uint16Array<ArrayBuffer>
                        : Arg extends Int32Array
                          ? Int32Array<ArrayBuffer>
                          : Arg extends Uint32Array
                            ? Uint32Array<ArrayBuffer>
                            : Arg extends Float32Array
                              ? Float32Array<ArrayBuffer>
                              : Arg extends Float64Array
                                ? Float64Array<ArrayBuffer>
                                : Arg extends BigInt64Array
                                  ? BigInt64Array<ArrayBuffer>
                                  : Arg extends BigUint64Array
                                    ? BigUint64Array<ArrayBuffer>
                                    : Arg extends ArrayBufferView
                                      ? ArrayBufferView<ArrayBuffer>
                                      : Arg extends ArrayBuffer
                                        ? ArrayBuffer
                                        : Arg extends Set<infer T>
                                          ? Set<Unboxed<T, NewHandle>>
                                          : Arg extends Map<infer K, infer V>
                                            ? Map<Unboxed<K, NewHandle>, Unboxed<V, NewHandle>>
                                            : Arg extends [infer A0, ...infer Rest]
                                              ? [Unboxed<A0, NewHandle>, ...Unboxed<Rest, NewHandle>]
                                              : Arg extends object
                                                ? { [Key in keyof Arg]: Unboxed<Arg[Key], NewHandle> }
                                                : Arg
