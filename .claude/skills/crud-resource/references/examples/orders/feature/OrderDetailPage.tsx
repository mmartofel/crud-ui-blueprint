import { useQueryClient } from '@tanstack/react-query'
import {
  getListOrdersQueryKey,
  useCancelOrder,
  useGetOrder,
} from '@/api/generated/endpoints/orders/orders'
import { CancelOrderBody } from '@/api/generated/endpoints/orders/orders.zod'
import { NotFoundPage } from '@/components/app/NotFoundPage'
import { ResourceDetail } from '@/components/app/ResourceDetail'
import { useUuidParam } from '@/lib/ids'
import { getResource } from '@/manifest'

const orders = getResource('orders')
// The input of each action, without the version the page adds.
const schemas = {
  cancel: CancelOrderBody.omit({ version: true }),
}

export function OrderDetailPage() {
  const id = useUuidParam()
  return id === null ? <NotFoundPage /> : <OrderDetail id={id} />
}

function OrderDetail({ id }: { id: string }) {
  const queryClient = useQueryClient()
  const query = useGetOrder(id)
  const cancel = useCancelOrder()
  return (
    <ResourceDetail
      resource={orders}
      query={query}
      commands={{
        run: {
          cancel: (data) => cancel.mutateAsync({ id, data }),
        },
        schemas,
        // The detail page reads the record until it reaches the command's version; lists are refetched.
        onChanged: () => void queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey() }),
      }}
    />
  )
}
