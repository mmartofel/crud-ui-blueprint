import type { RecordId } from '@/lib/ids'

/**
 * What every command of a command resource returns (docs/API-CONTRACT.md section 11): the aggregate's id and its
 * version after the command. The read model has caught up once a read returns at least this version.
 */
export interface CommandResult {
  id: RecordId
  version: number
}

/** A record of a command resource as the read model returns it. */
export interface CommandRecord {
  id: RecordId
  version: number
  /** The action path segments the current user may run now; empty for a reader. */
  allowedActions?: readonly string[]
}
