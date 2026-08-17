import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import type { Role } from '../modules/auth/auth.types';

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/clientes', label: 'Clientes', roles: ['DEV', 'ENCARGADO', 'BARBERO'] },
  { to: '/usuarios', label: 'Usuarios', roles: ['DEV', 'ENCARGADO'] },
  { to: '/jornadas', label: 'Jornadas laborales', roles: ['DEV', 'ENCARGADO'] },
  { to: '/estadisticas', label: 'Estadisticas', roles: ['DEV', 'ENCARGADO'] },
];

export function AdminLayout() {
  const { user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-logo">Kort</div>
        <nav>
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
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
