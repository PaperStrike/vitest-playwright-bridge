import { addExtension, Packr, type Options } from 'msgpackr'
import { Handle, PendingHandle } from './Handle'
import type { SerializableValue } from './types'

const packerOptions: Options = {
  structuredClone: true,
  useBigIntExtension: true,
}

const strictPacker = new Packr({
  ...packerOptions,
  writeFunction: () => {
    throw new Error('Cannot serialize functions')
  },
})

const nullFallbackPacker = new Packr({
  ...packerOptions,
  writeFunction: () => null,
})

let currentTargetMap: Map<string, unknown> | null = null
let createHandle: ((id: string) => Handle) | null = null

export const serialize = (
  value: SerializableValue,
  options: {
    useNullFallback?: boolean
  } = {},
): Uint8Array => {
  const packer = options.useNullFallback ? nullFallbackPacker : strictPacker
  return packer.pack(value) as Uint8Array
}

export const deserialize = (
  buffer: Uint8Array,
  options: {
    targetMap?: Map<string, unknown>
    createHandle?: ((id: string) => Handle)
  },
): SerializableValue => {
  currentTargetMap = options.targetMap ?? null
  createHandle = options.createHandle ?? null
  return strictPacker.unpack(buffer) as SerializableValue
}

const enum BridgeMessageExtensionType {
  Handle = 1,
  PendingHandle = 2,
  Error = 3,
}

addExtension({
  Class: Handle,
  type: BridgeMessageExtensionType.Handle,
  write(handle: Handle) {
    return handle._id
  },
  read(id: string) {
    if (!currentTargetMap) {
      throw new Error('No map available to unpack Handle')
    }
    if (!currentTargetMap.has(id)) {
      throw new Error(`Unexpected handle with id ${id}`)
    }
    return currentTargetMap.get(id)
  },
})

addExtension({
  Class: PendingHandle,
  type: BridgeMessageExtensionType.PendingHandle,
  write(handle: PendingHandle) {
    return handle._id
  },
  read(id: string) {
    if (!createHandle) {
      throw new Error('No handle creator available to unpack PendingHandle')
    }
    return createHandle(id)
  },
})

// The built-in Error extension does not serialize 'stack' and does not support circular causes.
const commonErrorClassNames = new Set([
  'Error',
  // 'AggregateError',
  'EvalError',
  'RangeError',
  'ReferenceError',
  // 'SuppressedError',
  'SyntaxError',
  'TypeError',
  'URIError',
])
addExtension({
  Class: Error,
  type: BridgeMessageExtensionType.Error,
  write(error: Error) {
    return [error.name, error.message, error.cause, error.stack]
  },
  read([name, message, cause, stack]: [string, string, unknown, string | undefined]) {
    const errorClass = commonErrorClassNames.has(name) && typeof globalThis[name as 'Error'] === 'function'
      ? globalThis[name as 'Error']
      : Error
    const error = new errorClass(message)
    error.name = name
    error.cause = cause
    if (stack) {
      error.stack = stack
    }
    else {
      delete error.stack
    }
    return error
  },
})
