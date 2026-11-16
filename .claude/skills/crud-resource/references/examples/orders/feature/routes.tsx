import { Outlet, type RouteObject } from 'react-router'
import { RequireRole } from '@/auth'
import { getResource } from '@/manifest'

const orders = getResource('orders')

// Pages load lazily; read routes need a read role, create needs a write role; a command resource has no edit page (ui-manifest.yaml).
export const ordersRoutes: RouteObject[] = [
  {
    path: orders.route,
    element: (
      <RequireRole roles={orders.permissions.read}>
        <Outlet />
      </RequireRole>
    ),
    children: [
      { index: true, lazy: () => import('./OrdersListPage').then((m) => ({ Component: m.OrdersListPage })) },
      { path: ':id', lazy: () => import('./OrderDetailPage').then((m) => ({ Component: m.OrderDetailPage })) },
      {
        element: (
          <RequireRole roles={orders.permissions.write}>
            <Outlet />
          </RequireRole>
        ),
        children: [
          { path: 'new', lazy: () => import('./OrderFormPage').then((m) => ({ Component: m.OrderCreatePage })) },
        ],
      },
    ],
  },
]
