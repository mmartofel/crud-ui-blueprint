import { keepPreviousData } from '@tanstack/react-query'
import { useListOrders } from '@/api/generated/endpoints/orders/orders'
import { ListOrdersQueryParams } from '@/api/generated/endpoints/orders/orders.zod'
import { ListOrdersStatus } from '@/api/generated/model'
import { ResourceList } from '@/components/app/list/ResourceList'
import { useListState } from '@/components/app/list/listState'
import { getResource } from '@/manifest'

const orders = getResource('orders')
const filterValues = { status: Object.values(ListOrdersStatus) }

// A command resource: no row menu (no edit, no delete); the actions are on the detail page.
export function OrdersListPage() {
  const list = useListState(orders, ListOrdersQueryParams)
  const query = useListOrders(list.apiParams, { query: { placeholderData: keepPreviousData } })
  return <ResourceList resource={orders} list={list} query={query} filterValues={filterValues} />
}
