import { createBrowserRouter } from 'react-router-dom';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicLayout } from './layouts/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './modules/auth/LoginPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { ClientsPage } from './modules/clients/ClientsPage';
import { UsersPage } from './modules/users/UsersPage';
import { ParametrizadosPage } from './modules/catalogs/ParametrizadosPage';
import { TurnosPage } from './modules/turnos/TurnosPage';
import { CortesPage } from './modules/cortes/CortesPage';
import { ArticulosPage } from './modules/articulos/ArticulosPage';
import { VentasPage } from './modules/ventas/VentasPage';
import { TesoreriaPage } from './modules/tesoreria/TesoreriaPage';
import { JornadasPage } from './modules/jornadas/JornadasPage';
import { EstadisticasPage } from './modules/estadisticas/EstadisticasPage';
import { LandingHomePage } from './modules/landing/LandingHomePage';
import { ContactPage } from './modules/landing/ContactPage';
import { TurnoWizardPage } from './modules/public-turnos/TurnoWizardPage';
import { StorePage } from './modules/public-store/StorePage';
import { SuppliersPage } from './modules/suppliers/SuppliersPage';
import { PurchaseOrdersPage } from './modules/purchase-orders/PurchaseOrdersPage';
import { PurchaseOrderDetailPage } from './modules/purchase-orders/PurchaseOrderDetailPage';
import { ReportsPage } from './modules/reports/ReportsPage';
import { PlanSettingsPage } from './modules/plan/PlanSettingsPage';

export const router = createBrowserRouter([
  {
    path: '/admin/login',
    element: <LoginPage />,
  },
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <LandingHomePage /> },
      { path: '/turnos', element: <TurnoWizardPage /> },
      { path: '/tienda', element: <StorePage /> },
      { path: '/contacto', element: <ContactPage /> },
    ],
  },
  {
    path: '/admin',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'clientes', element: <ClientsPage /> },
          { path: 'turnos', element: <TurnosPage /> },
          { path: 'cortes', element: <CortesPage /> },
          // Plan Integral: rutas accesibles a cualquier rol logueado (incluido
          // Barbero) - el gating real es por plan, no por rol (ver PlanGate
          // dentro de cada pagina y requirePlan.ts en el backend).
          { path: 'proveedores', element: <SuppliersPage /> },
          { path: 'ordenes-compra', element: <PurchaseOrdersPage /> },
          { path: 'ordenes-compra/:id', element: <PurchaseOrderDetailPage /> },
          { path: 'reportes', element: <ReportsPage /> },
          {
            element: <ProtectedRoute allowedRoles={['DEV', 'ENCARGADO']} />,
            children: [
              { path: 'articulos', element: <ArticulosPage /> },
              { path: 'ventas', element: <VentasPage /> },
              { path: 'tesoreria', element: <TesoreriaPage /> },
              { path: 'parametrizados', element: <ParametrizadosPage /> },
              { path: 'usuarios', element: <UsersPage /> },
              { path: 'jornadas', element: <JornadasPage /> },
              { path: 'estadisticas', element: <EstadisticasPage /> },
            ],
          },
          {
            element: <ProtectedRoute allowedRoles={['DEV']} />,
            children: [{ path: 'plan', element: <PlanSettingsPage /> }],
          },
        ],
      },
    ],
  },
]);
