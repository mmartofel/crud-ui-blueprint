import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { z } from 'zod'
import type { CommandRecord, CommandResult } from '@/api/commands'
import { Button } from '@/components/ui/button'
import { actionLabelKey, tDynamic } from '@/i18n/dynamic'
import { offeredActions, type ActionManifest, type Resource } from '@/manifest'
import { ActionDialog } from './ActionDialog'

/** What a command resource's detail page needs from its feature: the generated command functions per action. */
export interface CommandHandlers {
  /**
   * One function per action name, e.g. `{ cancel: (data) => cancel.mutateAsync({ id, data }) }`. The body is the
   * action's input, validated with its schema, plus `version`: typed `never` here, so each generated mutation keeps
   * its own request type (`CancelOrderRequest`).
   */
  run: Record<string, (body: never) => Promise<CommandResult>>
  /** The generated body schema of each action that has input, without `version`. */
  schemas?: Record<string, z.ZodObject>
  /** Allowed values of the actions' enum fields. */
  enumValues?: Record<string, readonly string[]>
  /** Updates the query cache after a command was accepted: invalidate the lists that show the record. */
  onChanged: (result: CommandResult) => void
}

interface CommandActionsProps {
  resource: Resource
  record: CommandRecord
  commands: CommandHandlers
  /** A command was accepted: the detail page waits for its version. */
  onSent: (result: CommandResult) => void
  onStale: () => void
  onRefresh: () => void
}

/**
 * The detail page's action buttons: the record's `allowedActions` that the manifest describes, in manifest order. The
 * server decides what is allowed (a reader gets none); an action the manifest does not describe is not offered.
 */
export function CommandActions({ resource, record, commands, onSent, onStale, onRefresh }: CommandActionsProps) {
  const { t } = useTranslation()
  const [current, setCurrent] = useState<ActionManifest>()
  const actions = offeredActions(resource, record.allowedActions).filter((action) => commands.run[action.name])

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action.name}
          variant={action.destructive ? 'destructive' : 'outline'}
          onClick={() => setCurrent(action)}
        >
          {tDynamic(t, actionLabelKey(resource.key, action.name))}
        </Button>
      ))}
      <ActionDialog
        key={current?.name}
        resource={resource}
        action={current}
        record={record}
        schema={current ? commands.schemas?.[current.name] : undefined}
        enumValues={commands.enumValues}
        run={(body) => commands.run[current!.name](body as never)}
        onSent={(result) => {
          commands.onChanged(result)
          toast.success(t('common.command.sent', { action: tDynamic(t, actionLabelKey(resource.key, current!.name)) }))
          onSent(result)
        }}
        onStale={onStale}
        onRefresh={onRefresh}
        onClose={() => setCurrent(undefined)}
      />
    </>
  )
}
