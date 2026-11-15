import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Clock, LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import type { CommandRecord, CommandResult } from '@/api/commands'
import { isApiError } from '@/api/fetcher'
import { sourceOf, type AnyRecord } from '@/api/sources'
import { useRoles } from '@/auth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { canWrite, formatDisplay, getPath, isCommandResource, type Resource } from '@/manifest'
import { CommandActions, type CommandHandlers } from './commands/CommandActions'
import { useAwaitVersion, type AwaitState } from './commands/useAwaitVersion'
import { ConfirmDialog } from './ConfirmDialog'
import { DataState } from './DataState'
import { DetailSections } from './DetailSections'
import { DetailSkeleton } from './DetailSkeleton'
import { errorPageFor } from './errorPageFor'
import { renderFieldValue } from './formatValue'
import { listFocusSearch, useListHref } from './list/listState'
import { PageHeader } from './PageHeader'
import { RelatedLists } from './RelatedList'
import { useDeleteRecord } from './useDeleteRecord'

/** The parts of a generated get query (`useGetPerson(id)`) the detail reads. */
export interface RecordQuery<T extends AnyRecord> {
  data?: T
  error: unknown
  isPending: boolean
  isError: boolean
  refetch: () => unknown
}

interface ResourceDetailProps<T extends AnyRecord> {
  resource: Resource
  query: RecordQuery<T>
  /** CRUD resource: deletes the record (the generated delete mutation). */
  remove?: (record: T) => Promise<unknown>
  /** CRUD resource: updates the query cache after a delete: remove the record's detail query, invalidate the lists. */
  onDeleted?: (record: T) => void
  /** Command resource (`kind: commands`): the generated command functions per action. */
  commands?: CommandHandlers
}

/** Router state of a detail page opened right after a create: the version the create returned. */
export interface AwaitVersionState {
  awaitVersion: number
}

const awaitedVersion = (state: unknown) =>
  typeof state === 'object' && state !== null && typeof (state as AwaitVersionState).awaitVersion === 'number'
    ? (state as AwaitVersionState).awaitVersion
    : undefined

/**
 * A resource's detail page: 403/404 pages, the four data states, back link, the record's name with its
 * `detail.status` badge, Edit and Delete for writers, the fields in section cards and the related lists.
 */
export function ResourceDetail<T extends AnyRecord>({ resource, query, remove, onDeleted, commands }: ResourceDetailProps<T>) {
  const commandResource = isCommandResource(resource)
  // A command resource waits for the version of the last command: the create that opened this page, or an action.
  const [target, setTarget] = useState(awaitedVersion(useLocation().state))
  const awaiting = useAwaitVersion(query as RecordQuery<T & { version: number }>, commandResource ? target : undefined)
  // Right after a create the read model may not have the record yet: "processing", not the not-found page.
  const notThereYet = awaiting.waiting && isApiError(query.error) && query.error.status === 404
  if (notThereYet) {
    return (
      <>
        <ProcessingNotice awaiting={awaiting} />
        <DetailSkeleton />
      </>
    )
  }
  return (
    errorPageFor(query.error) ?? (
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        onRetry={() => void query.refetch()}
        loading={<DetailSkeleton />}
      >
        {query.data && (
          <DetailView
            resource={resource}
            record={query.data}
            remove={remove}
            onDeleted={onDeleted}
            commands={commands}
            awaiting={awaiting}
            onSent={(result) => setTarget(result.version)}
            refetch={() => void query.refetch()}
          />
        )}
      </DataState>
    )
  )
}

/** While a command's change is on its way to the read model; after about 5 s it says so plainly. */
function ProcessingNotice({ awaiting }: { awaiting: AwaitState }) {
  const { t } = useTranslation()
  if (!awaiting.waiting) return null
  return (
    <Alert className="mb-4" role="status">
      {awaiting.slow ? <Clock aria-hidden /> : <LoaderCircle aria-hidden className="animate-spin motion-reduce:animate-none" />}
      <AlertTitle>{t(awaiting.slow ? 'common.command.slowTitle' : 'common.command.processingTitle')}</AlertTitle>
      <AlertDescription>{t(awaiting.slow ? 'common.command.slowText' : 'common.command.processingText')}</AlertDescription>
    </Alert>
  )
}

interface DetailViewProps<T extends AnyRecord> extends Omit<ResourceDetailProps<T>, 'query'> {
  record: T
  awaiting: AwaitState
  onSent: (result: CommandResult) => void
  refetch: () => void
}

function DetailView<T extends AnyRecord>({
  resource,
  record,
  remove,
  onDeleted,
  commands,
  awaiting,
  onSent,
  refetch,
}: DetailViewProps<T>) {
  const { t, i18n } = useTranslation()
  const language = i18n.resolvedLanguage ?? i18n.language
  const roles = useRoles()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const listHref = useListHref(resource)
  const [staleOpen, setStaleOpen] = useState(false)
  const deletion = useDeleteRecord<T>({
    resource,
    remove: remove ?? (() => Promise.reject(new Error(`${resource.key} has no delete`))),
    onDeleted: (deleted) => {
      deletedRecord.current = deleted
      // Before leaving: the list page reads its cache while rendering, so cached lists would show the deleted
      // record until the refetch. This page observes no list of its own resource, so nothing refetches here.
      queryClient.removeQueries({ queryKey: sourceOf(resource.key).listKey({}) })
      // The list puts focus in its search box: the Delete button that had it is gone.
      navigate(listHref, { replace: true, state: listFocusSearch })
    },
  })
  // The feature's cache update (remove the detail query, invalidate the lists) waits until this page has unmounted:
  // removing the detail query while the page (or the breadcrumbs) still shows the record would fetch it again (a 404).
  // It runs before the list page subscribes, so the list still loads only once.
  const deletedRecord = useRef<T>(undefined)
  const onDeletedRef = useRef(onDeleted ?? (() => {}))
  useEffect(() => {
    onDeletedRef.current = onDeleted ?? (() => {})
  })
  useEffect(
    () => () => {
      const deleted = deletedRecord.current
      if (deleted) onDeletedRef.current(deleted)
    },
    [],
  )
  const status = resource.detail.status

  return (
    <>
      <Button asChild variant="link" className="mb-2 -ml-3 text-muted-foreground">
        <Link to={listHref}>
          <ArrowLeft aria-hidden />
          {t('common.actions.backToList')}
        </Link>
      </Button>
      <PageHeader
        title={formatDisplay(resource.display, record)}
        badge={status && renderFieldValue(resource, status, getPath(record, status), t, language)}
        actions={
          isCommandResource(resource) ? (
            commands && (
              <CommandActions
                resource={resource}
                record={record as unknown as CommandRecord}
                commands={commands}
                onSent={onSent}
                onStale={() => setStaleOpen(true)}
                onRefresh={refetch}
              />
            )
          ) : (
            canWrite(roles, resource) && (
            <>
              <Button asChild variant="outline">
                <Link to={`${resource.route}/${record.id}/edit`}>
                  <Pencil aria-hidden />
                  {t('common.actions.edit')}
                </Link>
              </Button>
              <Button variant="destructive" onClick={() => deletion.request(record)}>
                <Trash2 aria-hidden />
                {t('common.actions.delete')}
              </Button>
            </>
            )
          )
        }
      />
      <ProcessingNotice awaiting={awaiting} />
      <div className="flex flex-col gap-6">
        <DetailSections resource={resource} record={record} />
        <RelatedLists resource={resource} id={record.id} />
      </div>
      {deletion.dialog}
      <ConfirmDialog
        open={staleOpen}
        onOpenChange={setStaleOpen}
        title={t('common.form.staleTitle')}
        description={t('common.command.staleText')}
        confirmLabel={t('common.form.reload')}
        onConfirm={() => {
          setStaleOpen(false)
          refetch()
        }}
      />
    </>
  )
}
