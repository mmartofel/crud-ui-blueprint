import { useEffect, useRef, useState } from 'react'
import { isApiError } from '@/api/fetcher'

/** Delays between reads while waiting, about 5 s in all (docs/API-CONTRACT.md section 11). */
export const AWAIT_DELAYS_MS = [200, 300, 500, 800, 1000, 1000, 1200]
/** After that the record is "still processing": reads go on in the background at this interval. */
export const AWAIT_SLOW_INTERVAL_MS = 3000

interface VersionedQuery {
  data?: { version: number }
  error: unknown
  refetch: () => unknown
}

export interface AwaitState {
  /** A command was sent and the read model has not reached its version yet. */
  waiting: boolean
  /** Still waiting after about 5 s: the page says so and keeps reading in the background. */
  slow: boolean
}

/**
 * Reads the record until its `version` reaches `target`, the version a command returned. A 404 counts as "not there
 * yet": right after a create the read model may not have the record. Without a target nothing happens.
 */
export function useAwaitVersion(query: VersionedQuery, target: number | undefined): AwaitState {
  const notYet = query.error === null || query.error === undefined || (isApiError(query.error) && query.error.status === 404)
  const reached = target === undefined || (query.data !== undefined && query.data.version >= target)
  const waiting = !reached && notYet

  // A new target starts the back-off again (state adjusted during render, not in an effect).
  const [progress, setProgress] = useState({ target, attempt: 0 })
  if (progress.target !== target) setProgress({ target, attempt: 0 })
  const attempt = progress.target === target ? progress.attempt : 0

  // The latest refetch without making it an effect dependency: the query object changes on every render.
  const refetch = useRef(query.refetch)
  useEffect(() => {
    refetch.current = query.refetch
  })

  useEffect(() => {
    if (!waiting) return
    const delay = AWAIT_DELAYS_MS[attempt] ?? AWAIT_SLOW_INTERVAL_MS
    const timer = setTimeout(() => {
      void refetch.current()
      setProgress((current) => ({ ...current, attempt: current.attempt + 1 }))
    }, delay)
    return () => clearTimeout(timer)
  }, [waiting, attempt])

  return { waiting, slow: waiting && attempt >= AWAIT_DELAYS_MS.length }
}
