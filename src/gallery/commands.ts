import { ApiError } from '@/api/fetcher'
import type { CommandResult } from '@/api/commands'

// A fake command resource for the gallery: one delivery, commands that are accepted at once (202 with the new
// version), and a read model that reaches that version only after a delay, as an eventually consistent API does
// (docs/API-CONTRACT.md section 11). The outcome picker makes the next command fail the ways the API can.

export type CommandOutcome = 'accepted' | 'slow' | 'stale' | 'invalid-state'

export const commandOutcomes: Record<CommandOutcome, string> = {
  accepted: 'Accepted, read model catches up in 1.5 s',
  slow: 'Accepted, read model takes 9 s (still processing)',
  stale: 'Stale version (409)',
  'invalid-state': 'State no longer allows it (409 invalid-state)',
}

const READ_MODEL_DELAY_MS: Record<'accepted' | 'slow', number> = { accepted: 1500, slow: 9000 }

type DeliveryStatus = 'SCHEDULED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

interface Delivery {
  id: string
  carrier: string
  scheduledFor: string
  trackingNumber?: string
  cancelReason?: string
  status: DeliveryStatus
  version: number
  updatedAt: string
}

export type DeliveryRecord = Delivery & { allowedActions: string[] }

const start: Delivery = {
  id: '682c7baf-b7c6-4bec-a728-48bc2d12ee28',
  carrier: 'DHL',
  scheduledFor: '2026-11-20',
  status: 'SCHEDULED',
  version: 0,
  updatedAt: '2026-11-16T09:30:00Z',
}

/** What the server would offer a writer in each status (the order is taken as paid and shipped). */
const allowed: Record<DeliveryStatus, string[]> = {
  SCHEDULED: ['ship', 'cancel'],
  SHIPPED: ['complete'],
  DELIVERED: [],
  CANCELLED: [],
}

const applied: Record<string, (delivery: Delivery, body: Record<string, unknown>) => Delivery> = {
  ship: (d, body) => ({ ...d, status: 'SHIPPED', trackingNumber: String(body.trackingNumber) }),
  complete: (d) => ({ ...d, status: 'DELIVERED' }),
  cancel: (d, body) => ({ ...d, status: 'CANCELLED', cancelReason: String(body.reason) }),
}

let current = start
let next: { delivery: Delivery; at: number } | undefined

const later = <T>(value: () => T) => new Promise<T>((resolve, reject) => setTimeout(() => {
  try {
    resolve(value())
  } catch (error) {
    reject(error)
  }
}, 400))

export const deliveryReadModel = {
  id: start.id,

  /** The read side: the old record until the last command's delay has passed; a reader is offered nothing. */
  get(writer: boolean): Promise<DeliveryRecord> {
    if (next && Date.now() >= next.at) {
      current = next.delivery
      next = undefined
    }
    return Promise.resolve({ ...current, allowedActions: writer ? allowed[current.status] : [] })
  },

  /** The command side: accepts the action with the version the client read, or fails as `outcome` says. */
  run(action: string, body: Record<string, unknown> & { version: number }, outcome: CommandOutcome): Promise<CommandResult> {
    return later(() => {
      if (outcome === 'stale') throw new ApiError(409, 'Conflict', 'The record was changed by someone else.')
      if (outcome === 'invalid-state')
        throw new ApiError(409, 'Conflict', 'The delivery is no longer in a state that allows this.', [
          { code: 'invalid-state', message: 'not allowed in the current state' },
        ])
      const base = next?.delivery ?? current
      const version = base.version + 1
      next = {
        delivery: { ...applied[action](base, body), version, updatedAt: new Date().toISOString() },
        at: Date.now() + READ_MODEL_DELAY_MS[outcome],
      }
      return { id: start.id, version }
    })
  },

  /** Back to a scheduled delivery. */
  reset() {
    current = start
    next = undefined
  },
}
