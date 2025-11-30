import { describe, expect, test } from 'vitest'
import { deserialize, serialize, type SerializableValue } from '../src/shared/serializer'

describe('serializer', () => {
  test('should handle simple objects', () => {
    const obj = { a: 1, b: 'test', c: true }
    const copy = deserialize(serialize(obj), {})
    expect(copy).toEqual(obj)
  })

  test('should handle arrays', () => {
    const arr = [1, 'test', true, null]
    const copy = deserialize(serialize(arr), {})
    expect(copy).toEqual(arr)
  })

  test('should handle Set', () => {
    const set = new Set([1, 'test', true])
    const copy = deserialize(serialize(set), {}) as typeof set
    expect(copy).toBeInstanceOf(Set)
    expect([...copy]).toEqual([...set])
  })

  test('should handle Map', () => {
    const map = new Map<string, SerializableValue>([
      ['a', 1],
      ['b', 'test'],
      ['c', true],
    ])
    const copy = deserialize(serialize(map), {}) as typeof map
    expect(copy).toBeInstanceOf(Map)
    expect([...copy]).toEqual([...map])
  })

  test('should handle Error', () => {
    const errorValue = new Error('Test error', { cause: new Error('Cause error') })
    errorValue.stack = 'Custom stack trace'
    const copy = deserialize(serialize(errorValue), {}) as typeof errorValue
    expect(copy).toBeInstanceOf(Error)
    expect(copy.message).toBe(errorValue.message)
    expect(copy.stack).toBe(errorValue.stack)
    expect(copy.cause).toBeInstanceOf(Error)
    expect((copy.cause as Error).message).toBe('Cause error')
  })

  test('should handle BigInt', () => {
    const bigIntValue = BigInt('12345678901234567890')
    const copy = deserialize(serialize(bigIntValue), {})
    expect(copy).toBe(bigIntValue)
  })

  test('should handle Large BigInt', () => {
    const largeBigIntValue = BigInt('123456789012345678901234567890123456789012345678901234567890')
    const copy = deserialize(serialize(largeBigIntValue), {})
    expect(copy).toBe(largeBigIntValue)
  })

  test('should handle Date', () => {
    const dateValue = new Date()
    const copy = deserialize(serialize(dateValue), {}) as typeof dateValue
    expect(copy).toBeInstanceOf(Date)
    expect(copy.getTime()).toEqual(dateValue.getTime())
  })

  test('should handle invalid Date', () => {
    const invalidDateValue = new Date('invalid date string')
    const copy = deserialize(serialize(invalidDateValue), {}) as typeof invalidDateValue
    expect(copy).toBeInstanceOf(Date)
    expect(isNaN(copy.getTime())).toBe(true)
  })

  test('should handle RegExp', () => {
    const regexValue = /test/gi
    const copy = deserialize(serialize(regexValue), {}) as typeof regexValue
    expect(copy).toBeInstanceOf(RegExp)
    expect(copy.source).toBe(regexValue.source)
    expect(copy.flags).toBe(regexValue.flags)
  })

  describe('TypedArrays', () => {
    const typedArrays = [
      new Int8Array([1, 2, 3]),
      new Uint8Array([1, 2, 3]),
      new Uint8ClampedArray([1, 2, 3]),
      new Int16Array([1, 2, 3]),
      new Uint16Array([1, 2, 3]),
      new Int32Array([1, 2, 3]),
      new Uint32Array([1, 2, 3]),
      new Float32Array([1, 2, 3]),
      new Float64Array([1, 2, 3]),
      new BigInt64Array([1n, 2n, 3n]),
      new BigUint64Array([1n, 2n, 3n]),
    ]

    for (const typedArray of typedArrays) {
      test(`should handle ${typedArray.constructor.name}`, () => {
        const copy = deserialize(serialize(typedArray), {}) as typeof typedArray
        expect(copy).toBeInstanceOf(typedArray.constructor)
        expect([...copy]).toEqual([...typedArray])
      })
    }
  })

  describe('circular references', () => {
    test('should handle objects with circular references', () => {
      const obj: SerializableValue = { name: 'circle' }
      obj.self = obj
      const copy = deserialize(serialize(obj), {})
      expect(copy).toEqual({ name: 'circle', self: copy })
    })

    test('should handle arrays with circular references', () => {
      const arr: SerializableValue[] = []
      arr.push(arr)
      const copy = deserialize(serialize(arr), {})
      expect(copy).toEqual([copy])
    })

    test('should handle Set with circular references', () => {
      const set = new Set<SerializableValue>()
      set.add(set)
      const copy = deserialize(serialize(set), {}) as typeof set
      expect(copy).toBeInstanceOf(Set)
      expect([...copy][0]).toBe(copy)
    })

    test('should handle Map with circular references', () => {
      const map = new Map<SerializableValue, SerializableValue>()
      map.set(map, map)
      const copy = deserialize(serialize(map), {}) as typeof map
      expect(copy).toBeInstanceOf(Map)
      expect(copy.get(copy)).toBe(copy)
    })

    test('should handle Error with circular object in cause', () => {
      const obj: SerializableValue = { name: 'circle' }
      obj.self = obj
      const errorValue = new Error('Test error', { cause: obj })
      errorValue.stack = 'Custom stack trace'
      const copy = deserialize(serialize(errorValue), {}) as typeof errorValue
      expect(copy).toBeInstanceOf(Error)
      expect(copy.message).toBe(errorValue.message)
      expect(copy.cause).toEqual({ name: 'circle', self: copy.cause })
      expect(copy.stack).toBe(errorValue.stack)
    })
  })

  describe('unsupported types', () => {
    // TODO: Should we serialize Symbol as undefined as Playwright does?
    // https://github.com/microsoft/playwright/blob/3a5a32d26da3c4da1bd45b71c8b9864e1ea480c9/packages/playwright-core/src/protocol/serializers.ts#L104
    test('should throw for Symbol', () => {
      const sym = Symbol('test')
      expect(() => serialize(sym as unknown as SerializableValue)).toThrow()
    })

    test('should throw for functions', () => {
      const func = () => { /* noop */ }
      expect(() => serialize(func as unknown as SerializableValue)).toThrow('Cannot serialize function')
    })

    test('should serialize functions as null when using null fallback', () => {
      const func = () => { /* noop */ }
      const copy = deserialize(serialize(func as unknown as SerializableValue, { useNullFallback: true }), {})
      expect(copy).toBeNull()
    })
  })
})
