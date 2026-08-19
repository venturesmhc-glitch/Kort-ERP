import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './modules/auth/LoginPage';
import { LazyRoute as Lazy } from './components/LazyRoute';

// Code-splitting por ruta: cada pagina del panel admin (y el resto del sitio
// publico salvo LoginPage/PublicLayout, que son parte del shell inicial) se
// carga en su propio chunk. Antes router.tsx importaba las ~24 paginas de
// forma estatica y todo terminaba en un unico bundle sin dividir - esto pesa
// especialmente en el wizard publico de turnos en mobile/3G, encima del
// cold-start del backend (ver docs/auditoria-2026-08-19.md #2.5).
const DashboardPage = lazy(() => import('./modules/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ClientsPage = lazy(() => import('./modules/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })));
const UsersPage = lazy(() => import('./modules/users/UsersPage').then((m) => ({ default: m.UsersPage })));
const ParametrizadosPage = lazy(() =>
  import('./modules/catalogs/ParametrizadosPage').then((m) => ({ default: m.ParametrizadosPage }))
);
const TurnosPage = lazy(() => import('./modules/turnos/TurnosPage').then((m) => ({ default: m.TurnosPage })));
const CortesPage = lazy(() => import('./modules/cortes/CortesPage').then((m) => ({ default: m.CortesPage })));
const ArticulosPage = lazy(() => import('./modules/articulos/ArticulosPage').then((m) => ({ default: m.ArticulosPage })));
const VentasPage = lazy(() => import('./modules/ventas/VentasPage').then((m) => ({ default: m.VentasPage })));
const TesoreriaPage = lazy(() => import('./modules/tesoreria/TesoreriaPage').then((m) => ({ default: m.TesoreriaPage })));
const JornadasPage = lazy(() => import('./modules/jornadas/JornadasPage').then((m) => ({ default: m.JornadasPage })));
const EstadisticasPage = lazy(() =>
  import('./modules/estadisticas/EstadisticasPage').then((m) => ({ default: m.EstadisticasPage }))
);
const LandingHomePage = lazy(() =>
  import('./modules/landing/LandingHomePage').then((m) => ({ default: m.LandingHomePage }))
);
const ContactPage = lazy(() => import('./modules/landing/ContactPage').then((m) => ({ default: m.ContactPage })));
const TurnoWizardPage = lazy(() =>
  import('./modules/public-turnos/TurnoWizardPage').then((m) => ({ default: m.TurnoWizardPage }))
);
const StorePage = lazy(() => import('./modules/public-store/StorePage').then((m) => ({ default: m.StorePage })));
const SuppliersPage = lazy(() => import('./modules/suppliers/SuppliersPage').then((m) => ({ default: m.SuppliersPage })));
const PurchaseOrdersPage = lazy(() =>
  import('./modules/purchase-orders/PurchaseOrdersPage').then((m) => ({ default: m.PurchaseOrdersPage }))
);
const PurchaseOrderDetailPage = lazy(() =>
  import('./modules/purchase-orders/PurchaseOrderDetailPage').then((m) => ({ default: m.PurchaseOrderDetailPage }))
);
const ReportsPage = lazy(() => import('./modules/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const PlanSettingsPage = lazy(() =>
  import('./modules/plan/PlanSettingsPage').then((m) => ({ default: m.PlanSettingsPage }))
);
const BusinessSettingsPage = lazy(() =>
  import('./modules/business-settings/BusinessSettingsPage').then((m) => ({ default: m.BusinessSettingsPage }))
);
const DiscountsPage = lazy(() => import('./modules/discounts/DiscountsPage').then((m) => ({ default: m.DiscountsPage })));

export const router = createBrowserRouter([
  {
    path: '/admin/login',
    element: <LoginPage />,
  },
  // El wizard vive fuera de PublicLayout: cada paso tiene su propia cabecera
  // (ver design_handoff_kort_ui) y no debe mostrar la navegacion del sitio
  // publico ni el link de login del equipo.
  {
    path: '/turnos',
    element: (
      <Lazy>
        <TurnoWizardPage />
      </Lazy>
    ),
  },
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: (
          <Lazy>
            <LandingHomePage />
          </Lazy>
        ),
      },
      {
        path: '/tienda',
        element: (
          <Lazy>
            <StorePage />
          </Lazy>
        ),
      },
      {
        path: '/contacto',
        element: (
          <Lazy>
            <ContactPage />
          </Lazy>
        ),
      },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: (
              <Lazy>
                <DashboardPage />
              </Lazy>
            ),
          },
          {
            path: 'clientes',
            element: (
              <Lazy>
                <ClientsPage />
              </Lazy>
            ),
          },
          {
            path: 'turnos',
            element: (
              <Lazy>
                <TurnosPage />
              </Lazy>
            ),
          },
          {
            path: 'cortes',
            element: (
              <Lazy>
                <CortesPage />
              </Lazy>
            ),
          },
          // Plan Integral: rutas accesibles a cualquier rol logueado (incluido
          // Barbero) - el gating real es por plan, no por rol (ver PlanGate
          // dentro de cada pagina y requirePlan.ts en el backend).
          {
            path: 'proveedores',
            element: (
              <Lazy>
                <SuppliersPage />
              </Lazy>
            ),
          },
          {
            path: 'ordenes-compra',
            element: (
              <Lazy>
                <PurchaseOrdersPage />
              </Lazy>
            ),
          },
          {
            path: 'ordenes-compra/:id',
            element: (
              <Lazy>
                <PurchaseOrderDetailPage />
              </Lazy>
            ),
          },
          {
            path: 'reportes',
            element: (
              <Lazy>
                <ReportsPage />
              </Lazy>
            ),
          },
          {
            element: <ProtectedRoute allowedRoles={['DEV', 'ENCARGADO']} />,
            children: [
              {
                path: 'articulos',
                element: (
                  <Lazy>
                    <ArticulosPage />
                  </Lazy>
                ),
              },
              {
                path: 'ventas',
                element: (
                  <Lazy>
                    <VentasPage />
                  </Lazy>
                ),
              },
              {
                path: 'descuentos',
                element: (
                  <Lazy>
                    <DiscountsPage />
                  </Lazy>
                ),
              },
              {
                path: 'tesoreria',
                element: (
                  <Lazy>
                    <TesoreriaPage />
                  </Lazy>
                ),
              },
              {
                path: 'parametrizados',
                element: (
                  <Lazy>
                    <ParametrizadosPage />
                  </Lazy>
                ),
              },
              {
                path: 'usuarios',
                element: (
                  <Lazy>
                    <UsersPage />
                  </Lazy>
                ),
              },
              {
                path: 'jornadas',
                element: (
                  <Lazy>
                    <JornadasPage />
                  </Lazy>
                ),
              },
              {
                path: 'estadisticas',
                element: (
                  <Lazy>
                    <EstadisticasPage />
                  </Lazy>
                ),
              },
              {
                path: 'negocio',
                element: (
                  <Lazy>
                    <BusinessSettingsPage />
                  </Lazy>
                ),
              },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['DEV']} />,
            children: [
              {
                path: 'plan',
                element: (
                  <Lazy>
                    <PlanSettingsPage />
                  </Lazy>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
]);
