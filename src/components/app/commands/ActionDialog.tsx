import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import { useForm, type FieldValues } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'
import type { CommandRecord, CommandResult } from '@/api/commands'
import { isApiError } from '@/api/fetcher'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { actionLabelKey, actionTextKey, tDynamic } from '@/i18n/dynamic'
import type { ActionManifest, Resource } from '@/manifest'
import { applyApiError } from '../form/applyApiError'
import { FormFields } from '../form/FormFields'
import { formResolver, isRequired } from '../form/formResolver'

const NO_INPUT = z.object({})

export interface ActionDialogProps {
  resource: Resource
  /** The action to run; the dialog is open while it is set. */
  action: ActionManifest | undefined
  record: CommandRecord
  /** The generated body schema of the action without `version` (`CancelOrderBody.omit({ version: true })`). */
  schema?: z.ZodObject
  /** Allowed values of the action's enum fields. */
  enumValues?: Record<string, readonly string[]>
  /** Sends the command; the body already has the `version` the user saw. */
  run: (body: Record<string, unknown> & { version: number }) => Promise<CommandResult>
  /** The command was accepted. */
  onSent: (result: CommandResult) => void
  /** 409 without field errors: someone else changed the record first. */
  onStale: () => void
  /** The record should be read again (the state no longer allows the action). */
  onRefresh: () => void
  onClose: () => void
}

/**
 * An action's dialog, mounted per opened action (its `key`), so each opening starts empty: a confirmation, or a small form for the action's input, validated with its generated schema.
 * It sends `{ ...input, version }`. Field errors stay on the fields; a stale version hands over to `onStale`; a rule
 * the current state breaks (409 `invalid-state`) is shown in the dialog and the record is read again.
 */
export function ActionDialog({
  resource,
  action,
  record,
  schema,
  enumValues,
  run,
  onSent,
  onStale,
  onRefresh,
  onClose,
}: ActionDialogProps) {
  const { t } = useTranslation()
  const fields = action?.form?.groups.flat() ?? []
  const bodySchema = schema ?? NO_INPUT
  const required = fields.filter((field) => isRequired(bodySchema, field))
  const numbers = fields.filter((field) => ['number', 'relation'].includes(action?.form?.fields?.[field]?.input ?? ''))
  const [formError, setFormError] = useState<string>()
  const form = useForm<FieldValues, unknown, FieldValues>({
    resolver: formResolver<FieldValues, FieldValues>(bodySchema as unknown as z.ZodType<FieldValues>, { numbers }),
    defaultValues: Object.fromEntries(fields.map((field) => [field, ''])),
  })
  const { isSubmitting } = form.formState

  if (!action) return null
  // FormFields lays out a resource's form: the action's input as that form, labelled as the resource's fields.
  const inputResource: Resource = { ...resource, form: { groups: action.form?.groups ?? [], fields: action.form?.fields } }
  const label = tDynamic(t, actionLabelKey(resource.key, action.name))

  const submit = async (body: FieldValues) => {
    setFormError(undefined)
    try {
      const result = await run({ ...body, version: record.version })
      onSent(result)
      onClose()
    } catch (error) {
      const outcome = applyApiError(error, form.setError, fields, t)
      if (outcome.kind === 'stale') {
        onClose()
        onStale()
        return
      }
      if (outcome.kind === 'form') setFormError(outcome.message)
      if (isApiError(error) && error.status === 409) onRefresh()
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent>
        <form noValidate onSubmit={form.handleSubmit(submit)} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{tDynamic(t, actionTextKey(resource.key, action.name))}</DialogDescription>
          </DialogHeader>
          {formError && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertTitle>{t('common.command.failedTitle')}</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}
          {fields.length > 0 && (
            <FormFields
              resource={inputResource}
              control={form.control}
              required={required}
              enumValues={enumValues}
              bare
            />
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              {t('common.actions.cancel')}
            </Button>
            <Button type="submit" variant={action.destructive ? 'destructive' : 'default'} disabled={isSubmitting}>
              {isSubmitting ? t('common.command.sending') : label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
