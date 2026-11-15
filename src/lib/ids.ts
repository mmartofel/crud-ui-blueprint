import { useParams } from 'react-router'

/** A record id: an integer (`int64`) or a UUID (`format: uuid`), as API-CONTRACT.md section 11 allows. */
export type RecordId = number | string

const INTEGER = /^[1-9]\d*$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * An id from a URL or an input: a positive integer becomes a number, a UUID stays a (lower-case) string, anything
 * else is null. The two shapes cannot be confused, so generic code needs no per-resource id type.
 */
export function parseRecordId(value: string | null | undefined): RecordId | null {
  if (!value) return null
  if (INTEGER.test(value) && Number.isSafeInteger(Number(value))) return Number(value)
  return UUID.test(value) ? value.toLowerCase() : null
}

/** The `:id` route param as a positive integer, or null when it is missing or malformed (→ 404 page). */
export function useIdParam(): number | null {
  const id = parseRecordId(useParams().id)
  return typeof id === 'number' ? id : null
}

/** The `:id` route param of a resource with UUID ids, or null when it is missing or malformed (→ 404 page). */
export function useUuidParam(): string | null {
  const id = parseRecordId(useParams().id)
  return typeof id === 'string' ? id : null
}
