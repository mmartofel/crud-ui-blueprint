import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getListOrdersQueryKey, useCreateOrder } from '@/api/generated/endpoints/orders/orders'
import { CreateOrderBody } from '@/api/generated/endpoints/orders/orders.zod'
import { ResourceForm } from '@/components/app/form/ResourceForm'
import { PageHeader } from '@/components/app/PageHeader'
import { useListHref } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const orders = getResource('orders')

/**
 * The create page of a command resource: the create returns only { id, version }; the form then opens the detail
 * page, which waits until the read model has the record. There is no edit page.
 */
export function OrderCreatePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const create = useCreateOrder()
  return (
    <>
      <PageHeader title={t('orders.newTitle')} />
      <ResourceForm
        resource={orders}
        schema={CreateOrderBody}
        save={(data) => create.mutateAsync({ data })}
        onSaved={() => void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() })}
        cancelHref={useListHref(orders)}
      />
    </>
  )
}
