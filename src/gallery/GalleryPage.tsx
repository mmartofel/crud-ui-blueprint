import { useState, type ReactNode } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ApiError } from '@/api/fetcher'
import { sourceOf } from '@/api/sources'
import { useRoles } from '@/auth'
import { ConfirmDialog } from '@/components/app/ConfirmDialog'
import { DataState } from '@/components/app/DataState'
import { DetailList } from '@/components/app/DetailList'
import { useDocumentTitle } from '@/components/app/useDocumentTitle'
import { PageHeader } from '@/components/app/PageHeader'
import { RelatedLists } from '@/components/app/RelatedList'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { DataTable } from '@/components/app/list/DataTable'
import { ListFilters } from '@/components/app/list/ListFilters'
import { ListSkeleton } from '@/components/app/list/ListSkeleton'
import { Pagination } from '@/components/app/list/Pagination'
import { SearchInput } from '@/components/app/list/SearchInput'
import { useListState } from '@/components/app/list/listState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { tDynamic } from '@/i18n/dynamic'
import { canWrite, formatDisplay, type ResourceKey } from '@/manifest'
import { CreateTaskBody } from '@/test/fixtures/api/tasks.zod'
import { UpdatePersonBody } from '@/test/fixtures/api/persons.zod'
import { persons, tasks } from './data'
import { personsResource, tasksResource } from './register'
import { useGalleryRole, type GalleryRole } from './role'

// Gallery chrome (section titles, notes) is a developer tool and stays in English; the components inside it use
// i18n as in the app.
const sections = [
  ['tokens', 'Colour tokens'],
  ['typography', 'Typography'],
  ['controls', 'Buttons and badges'],
  ['list', 'List'],
  ['detail', 'Detail'],
  ['form', 'Form'],
  ['states', 'States'],
  ['dialogs', 'Confirm dialog and toasts'],
] as const

export function GalleryPage() {
  const { role, setRole } = useGalleryRole()
  // Runs after the PageHeaders inside, so the tab is named after the gallery, not the last section.
  useDocumentTitle('Component gallery')
  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-page-title">Component gallery</h1>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            The generic components with the persons and tasks fixtures. Theme and language: header. Rules:
            docs/DESIGN.md.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="gallery-role">Role</Label>
          <Select value={role} onValueChange={(value) => setRole(value as GalleryRole)}>
            <SelectTrigger id="gallery-role" className="w-full md:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="writer">Writer (read + write)</SelectItem>
              <SelectItem value="reader">Reader (read only)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <nav aria-label="Gallery sections" className="-mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {sections.map(([id, title]) => (
          <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center text-primary underline-offset-4 hover:underline md:min-h-0">
            {title}
          </a>
        ))}
      </nav>
      <TokensSection />
      <TypographySection />
      <ControlsSection />
      <ListSection />
      <DetailSection />
      <FormSection />
      <StatesSection />
      <DialogsSection />
    </div>
  )
}

function Section({ id, children, note }: { id: (typeof sections)[number][0]; children: ReactNode; note?: string }) {
  const title = sections.find(([key]) => key === id)![1]
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 flex flex-col gap-4">
      <div className="border-b pb-2">
        <h2 id={`${id}-title`} className="text-section-title">
          {title}
        </h2>
        {note && <p className="mt-1 max-w-prose text-caption text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  )
}

const surfaces = [
  ['bg-background', 'background', 'The page'],
  ['bg-sidebar', 'sidebar', 'Navigation'],
  ['bg-card', 'card', 'Content surfaces'],
  ['bg-popover shadow-md', 'popover', 'Menus, dialogs, sheets'],
  ['bg-muted', 'muted', 'Quiet fills'],
  ['bg-accent', 'accent', 'Hover, selection'],
]
const colours = [
  ['bg-primary text-primary-foreground', 'primary'],
  ['bg-secondary text-secondary-foreground', 'secondary'],
  ['bg-success text-success-foreground', 'success'],
  ['bg-warning text-warning-foreground', 'warning'],
  ['bg-info text-info-foreground', 'info'],
  ['bg-destructive text-destructive-foreground', 'destructive'],
]

function TokensSection() {
  return (
    <Section id="tokens" note="Surfaces from lowest to highest, then the brand and status colours with their foregrounds.">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {surfaces.map(([className, name, use]) => (
          <div key={name} className={`rounded-lg border p-3 ${className}`}>
            <div className="text-sm font-medium">{name}</div>
            <div className="text-caption text-muted-foreground">{use}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {colours.map(([className, name]) => (
          <div key={name} className={`rounded-lg p-3 text-sm font-medium ${className}`}>
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {['shadow-xs', 'shadow-sm', 'shadow-md', 'shadow-lg'].map((shadow) => (
          <div key={shadow} className={`rounded-lg border bg-card p-3 text-sm ${shadow}`}>
            {shadow}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-sm border bg-card px-3 py-2 text-sm">rounded-sm</span>
        <span className="rounded-md border bg-card px-3 py-2 text-sm">rounded-md</span>
        <span className="rounded-lg border bg-card px-3 py-2 text-sm">rounded-lg</span>
        <span className="rounded-xl border bg-card px-3 py-2 text-sm">rounded-xl</span>
        <span className="rounded-full border bg-card px-3 py-2 text-sm">rounded-full</span>
      </div>
    </Section>
  )
}

function TypographySection() {
  const { i18n } = useTranslation()
  const number = new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2 })
  return (
    <Section id="typography" note="Inter Variable; numbers in tables and number inputs use tabular figures.">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <div className="text-page-title">Page title: Anna Kowalska</div>
            <div className="text-caption text-muted-foreground">text-page-title, 24/32, semibold</div>
          </div>
          <div>
            <div className="text-section-title">Section title: Address</div>
            <div className="text-caption text-muted-foreground">text-section-title, 16/24, semibold</div>
          </div>
          <div>
            <p className="max-w-prose text-sm">
              Body: collect the numbers from every department and send the summary to the board before the end of the
              month. Ambiguous characters stay apart: Il1 O0.
            </p>
            <div className="text-caption text-muted-foreground">text-sm, 14/20</div>
          </div>
          <div>
            <div className="text-caption text-muted-foreground">Caption: updated 1 October 2026, text-caption, 12/16</div>
          </div>
          <div className="w-fit text-sm tabular-nums">
            {[1234.5, 87.25, 10000].map((n) => (
              <div key={n} className="text-right">
                {number.format(n)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Section>
  )
}

function ControlsSection() {
  const { t } = useTranslation()
  return (
    <Section id="controls" note="Status badges use success, warning, info and destructive; the others are neutral.">
      <div className="flex flex-wrap gap-2">
        <Button>
          <Plus aria-hidden />
          {t('common.actions.new')}
        </Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">
          <Pencil aria-hidden />
          {t('common.actions.edit')}
        </Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">
          <Trash2 aria-hidden />
          {t('common.actions.delete')}
        </Button>
        <Button variant="link">Link</Button>
        <Button disabled>{t('common.actions.saving')}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Badge variant="success">{tDynamic(t, 'enums.PersonStatus.AVAILABLE')}</Badge>
        <Badge variant="warning">{tDynamic(t, 'enums.Priority.MEDIUM')}</Badge>
        <Badge variant="info">Info</Badge>
        <Badge variant="destructive">{tDynamic(t, 'enums.Priority.HIGH')}</Badge>
        <Badge variant="secondary">{tDynamic(t, 'enums.PersonStatus.UNAVAILABLE')}</Badge>
        <Badge variant="outline">{tDynamic(t, 'enums.Priority.LOW')}</Badge>
        <Badge>Default</Badge>
      </div>
    </Section>
  )
}

const personFilterValues = { status: ['AVAILABLE', 'UNAVAILABLE'] }

function ListSection() {
  const { t } = useTranslation()
  const roles = useRoles()
  const { state, apiParams, setPage, setSize, setSort, setQuery, setFilter, clearFilters } = useListState(personsResource)
  const source = sourceOf('persons' as ResourceKey)
  const query = useQuery({
    queryKey: source.listKey(apiParams),
    queryFn: () => source.list(apiParams),
    placeholderData: keepPreviousData,
  })
  const total = query.data?.page?.totalElements ?? 0
  return (
    <Section id="list" note="Table from md, cards below it. Search, filters, sorting and paging work on the sample data.">
      <PageHeader
        title={tDynamic(t, 'persons.title')}
        actions={
          canWrite(roles, personsResource) && (
            <Button>
              <Plus aria-hidden />
              {t('common.actions.new')}
            </Button>
          )
        }
      />
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1 md:flex-none md:basis-full">
          <SearchInput value={state.q} onChange={setQuery} />
        </div>
        <ListFilters
          resource={personsResource}
          values={state.filters}
          onChange={setFilter}
          onClear={clearFilters}
          enumValues={personFilterValues}
        />
      </div>
      <DataState
        isLoading={query.isPending}
        isError={query.isError}
        isEmpty={total === 0}
        loading={<ListSkeleton />}
        empty={state.q ? t('common.list.noResults', { q: state.q }) : t('common.list.noFilterResults')}
      >
        <div className="flex flex-col gap-4">
          <DataTable
            resource={personsResource}
            rows={query.data?.content ?? []}
            sort={state.sort}
            onSortChange={setSort}
            getRowHref={(person) => `${personsResource.route}/${person.id}`}
          />
          <Pagination
            page={state.page}
            size={state.size}
            pageSizes={personsResource.list.pageSizes}
            totalElements={total}
            totalPages={Math.ceil(total / state.size)}
            onPageChange={setPage}
            onSizeChange={setSize}
          />
        </div>
      </DataState>
      <h3 className="text-sm font-medium">{tDynamic(t, 'tasks.title')}: relations and boolean badges</h3>
      <DataTable
        resource={tasksResource}
        rows={tasks.slice(0, 5)}
        sort={{ field: 'dueDate', direction: 'asc' }}
        onSortChange={() => {}}
        getRowHref={(task) => `${tasksResource.route}/${task.id}`}
      />
    </Section>
  )
}

function DetailSection() {
  const { t } = useTranslation()
  const roles = useRoles()
  const person = persons[0]
  return (
    <Section id="detail" note="Header with actions (writer only), the fields in a card, the related list.">
      <div>
        <PageHeader
          title={formatDisplay(personsResource.display, person)}
          actions={
            canWrite(roles, personsResource) && (
              <>
                <Button variant="outline">
                  <Pencil aria-hidden />
                  {t('common.actions.edit')}
                </Button>
                <Button variant="destructive">
                  <Trash2 aria-hidden />
                  {t('common.actions.delete')}
                </Button>
              </>
            )
          }
        />
        <Card>
          <CardContent>
            <DetailList resource={personsResource} record={person} />
          </CardContent>
        </Card>
        <RelatedLists resource={personsResource} id={person.id} />
      </div>
    </Section>
  )
}

type SaveOutcome = 'success' | 'fields' | 'stale' | 'server'
const outcomes: Record<SaveOutcome, string> = {
  success: 'Succeeds',
  fields: 'Field errors (400)',
  stale: 'Stale version (409)',
  server: 'Server error (500)',
}

/** What a gallery save does: succeed, or fail the way the API can. */
function fakeSave<T extends { id: number; version: number }>(outcome: SaveOutcome, record: T, body: object): Promise<T> {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (outcome === 'fields')
        reject(
          new ApiError(400, 'Validation failed', undefined, [
            { field: 'email', code: 'unique', message: 'must be unique' },
            { field: 'birthDate', code: 'past', message: 'must be a past date' },
          ]),
        )
      else if (outcome === 'stale') reject(new ApiError(409, 'Conflict', 'The record was changed by someone else.'))
      else if (outcome === 'server') reject(new ApiError(500, 'Internal Server Error'))
      else resolve({ ...record, ...body, version: record.version + 1 })
    }, 600),
  )
}

const personEnums = { gender: ['MALE', 'FEMALE', 'OTHER'], status: ['AVAILABLE', 'UNAVAILABLE'] }
const taskEnums = { priority: ['LOW', 'MEDIUM', 'HIGH'] }
const UpdatePersonForm = UpdatePersonBody.omit({ version: true })

function FormSection() {
  const { t } = useTranslation()
  const [outcome, setOutcome] = useState<SaveOutcome>('fields')
  const person = persons[0]
  const newTask = { ...tasks[0], id: tasks.length + 1 }
  return (
    <Section id="form" note="Pick what the next save does, then save the person form: field errors, the stale-version dialog or a form-level alert.">
      <div className="flex flex-col gap-2">
        <Label htmlFor="gallery-outcome">Next save</Label>
        <Select value={outcome} onValueChange={(value) => setOutcome(value as SaveOutcome)}>
          <SelectTrigger id="gallery-outcome" className="w-full md:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(outcomes).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <PageHeader title={tDynamic(t, 'persons.editTitle', { name: formatDisplay(personsResource.display, person) })} />
        <ResourceForm
          resource={personsResource}
          schema={UpdatePersonForm}
          record={person}
          enumValues={personEnums}
          save={(body) => fakeSave(outcome, person, body)}
          onSaved={() => {}}
          reload={async () => person}
          cancelHref="/__gallery"
        />
      </div>
      <div>
        <PageHeader title={tDynamic(t, 'tasks.newTitle')} />
        <ResourceForm
          resource={tasksResource}
          schema={CreateTaskBody}
          enumValues={taskEnums}
          save={(body) => fakeSave(outcome, newTask, body)}
          onSaved={() => {}}
          cancelHref="/__gallery"
        />
      </div>
    </Section>
  )
}

function StatesSection() {
  const { t } = useTranslation()
  const [retries, setRetries] = useState(0)
  return (
    <Section id="states" note="Every data view has four states: loading, empty, error with retry, data.">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Loading</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataState isLoading isError={false} loading={<ListSkeleton rows={3} />} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Empty</h3>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DataState isLoading={false} isError={false} isEmpty empty={tDynamic(t, 'persons.empty')} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h3>Error</h3>
            </CardTitle>
            {retries > 0 && <CardDescription>Retried {retries}×</CardDescription>}
          </CardHeader>
          <CardContent>
            <DataState isLoading={false} isError onRetry={() => setRetries((n) => n + 1)} />
          </CardContent>
        </Card>
      </div>
    </Section>
  )
}

function DialogsSection() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const name = formatDisplay(personsResource.display, persons[0])
  const confirm = () => {
    setPending(true)
    setTimeout(() => {
      setPending(false)
      setOpen(false)
      toast.success(t('common.toast.deleted', { name }))
    }, 800)
  }
  return (
    <Section id="dialogs" note="Delete always asks and names the record. Toasts follow the theme.">
      <div className="flex flex-wrap gap-2">
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 aria-hidden />
          {t('common.actions.delete')}
        </Button>
        <Button variant="outline" onClick={() => toast.success(t('common.toast.updated', { name }))}>
          Success toast
        </Button>
        <Button variant="outline" onClick={() => toast.error(t('common.toast.deleteInUse', { name }))}>
          Error toast
        </Button>
        <Button variant="outline" onClick={() => toast.info('Info toast')}>
          Info toast
        </Button>
        <Button variant="outline" onClick={() => toast.warning('Warning toast')}>
          Warning toast
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t('common.delete.title', { name })}
        description={t('common.delete.text')}
        confirmLabel={t('common.actions.delete')}
        destructive
        pending={pending}
        onConfirm={confirm}
      />
    </Section>
  )
}
