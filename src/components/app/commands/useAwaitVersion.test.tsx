import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/fetcher'
import { AWAIT_DELAYS_MS, useAwaitVersion } from './useAwaitVersion'

const totalDelay = AWAIT_DELAYS_MS.reduce((sum, delay) => sum + delay, 0)

describe('useAwaitVersion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does nothing without a target', () => {
    const refetch = vi.fn()
    const { result } = renderHook(() => useAwaitVersion({ data: { version: 1 }, error: null, refetch }, undefined))
    act(() => void vi.advanceTimersByTime(10_000))
    expect(result.current).toEqual({ waiting: false, slow: false })
    expect(refetch).not.toHaveBeenCalled()
  })

  it('reads with back-off until the version arrives', () => {
    const refetch = vi.fn()
    const { result, rerender } = renderHook(
      ({ version }) => useAwaitVersion({ data: { version }, error: null, refetch }, 2),
      { initialProps: { version: 1 } },
    )
    expect(result.current.waiting).toBe(true)
    act(() => void vi.advanceTimersByTime(AWAIT_DELAYS_MS[0]))
    expect(refetch).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(AWAIT_DELAYS_MS[1]))
    expect(refetch).toHaveBeenCalledTimes(2)

    rerender({ version: 2 })
    expect(result.current).toEqual({ waiting: false, slow: false })
    act(() => void vi.advanceTimersByTime(10_000))
    expect(refetch).toHaveBeenCalledTimes(2)
  })

  it('treats a 404 as not there yet, and turns slow after about 5 s', () => {
    const refetch = vi.fn()
    const error = new ApiError(404, 'Not Found')
    const { result } = renderHook(() => useAwaitVersion({ data: undefined, error, refetch }, 0))
    expect(result.current).toEqual({ waiting: true, slow: false })
    // One act per read: each re-render schedules the next read.
    for (const delay of AWAIT_DELAYS_MS) act(() => void vi.advanceTimersByTime(delay))
    expect(totalDelay).toBeGreaterThanOrEqual(4000)
    expect(result.current).toEqual({ waiting: true, slow: true })
    const reads = refetch.mock.calls.length
    act(() => void vi.advanceTimersByTime(3000))
    expect(refetch.mock.calls.length).toBe(reads + 1)
  })

  it('stops on an error other than 404', () => {
    const refetch = vi.fn()
    const { result } = renderHook(() =>
      useAwaitVersion({ data: undefined, error: new ApiError(500, 'Server Error'), refetch }, 0),
    )
    expect(result.current.waiting).toBe(false)
    act(() => void vi.advanceTimersByTime(10_000))
    expect(refetch).not.toHaveBeenCalled()
  })
})
