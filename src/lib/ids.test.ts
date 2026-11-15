import { describe, expect, it } from 'vitest'
import { parseRecordId } from './ids'

describe('parseRecordId', () => {
  it('reads a positive integer as a number', () => {
    expect(parseRecordId('42')).toBe(42)
  })

  it('reads a UUID as a lower-case string', () => {
    expect(parseRecordId('682C7BAF-B7C6-4BEC-A728-48BC2D12EE28')).toBe('682c7baf-b7c6-4bec-a728-48bc2d12ee28')
  })

  it.each(['', '0', '-1', '1.5', '007', '9007199254740993', 'abc', '682c7baf-b7c6-4bec-a728', 'new'])(
    'rejects %j',
    (value) => {
      expect(parseRecordId(value)).toBeNull()
    },
  )

  it('rejects a missing value', () => {
    expect(parseRecordId(undefined)).toBeNull()
    expect(parseRecordId(null)).toBeNull()
  })
})
