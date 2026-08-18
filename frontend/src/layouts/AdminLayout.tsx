import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import type { Role } from '../modules/auth/auth.types';
import { listStockBajoRequest } from '../modules/articulos/articulos.api';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  badgeKey?: 'stockBajo';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Dashboard', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/clientes', label: 'Clientes', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/turnos', label: 'Turnos y horarios', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/cortes', label: 'Registro de cortes', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/articulos', label: 'Articulos y stock', roles: ['DEV', 'ENCARGADO'], badgeKey: 'stockBajo' },
  { to: '/admin/ventas', label: 'Ventas', roles: ['DEV', 'ENCARGADO'] },
  { to: '/admin/tesoreria', label: 'Tesoreria', roles: ['DEV', 'ENCARGADO'] },
  { to: '/admin/parametrizados', label: 'Parametrizados', roles: ['DEV', 'ENCARGADO'] },
  { to: '/admin/usuarios', label: 'Usuarios', roles: ['DEV', 'ENCARGADO'] },
  { to: '/admin/jornadas', label: 'Jornadas laborales', roles: ['DEV', 'ENCARGADO'] },
  { to: '/admin/estadisticas', label: 'Estadisticas', roles: ['DEV', 'ENCARGADO'] },
  // Plan Integral: visible a los 3 roles (el gating es por plan, no por rol,
  // ver PlanGate).
  { to: '/admin/proveedores', label: 'Proveedores', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/ordenes-compra', label: 'Ordenes de compra', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/reportes', label: 'Reportes', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/admin/plan', label: 'Plan', roles: ['DEV'] },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const canSeeStock = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const [stockBajoCount, setStockBajoCount] = useState(0);

  useEffect(() => {
    if (!canSeeStock) return;
    listStockBajoRequest()
      .then((articulos) => setStockBajoCount(articulos.length))
      .catch(() => undefined);
  }, [canSeeStock]);

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <NavLink to="/admin" end className="admin-logo">
          Kort
        </NavLink>
        <nav>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span>{item.label}</span>
              {item.badgeKey === 'stockBajo' && stockBajoCount > 0 && (
                <span className="nav-badge">{stockBajoCount}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="admin-content">
        <header className="admin-header">
          <div>
            {user && (
              <span>
                {user.firstName} {user.lastName} · {user.role}
              </span>
            )}
          </div>
          <div className="admin-header-actions">
            <NavLink to="/" className="nav-link">
              Ver sitio publico
            </NavLink>
            <ThemeToggle />
            <button type="button" onClick={logout}>
              Cerrar sesion
            </button>
          </div>
        </header>

        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
