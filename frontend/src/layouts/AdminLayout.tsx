import { useEffect, useState, type ComponentType, type SVGProps } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';
import { useTheme } from '../theme/ThemeProvider';
import type { Role } from '../modules/auth/auth.types';
import { useBusinessSettings } from '../modules/business-settings/BusinessSettingsContext';
import { useNotifications } from '../modules/notifications/useNotifications';
import { NotificationBell } from '../components/NotificationBell';
import {
  IconHome,
  IconCalendar,
  IconClients,
  IconServices,
  IconStock,
  IconSales,
  IconTreasury,
  IconStats,
  IconCatalog,
  IconSuppliers,
  IconPurchaseOrders,
  IconReports,
  IconUsers,
  IconSchedule,
  IconBusiness,
  IconDiscount,
  IconPlan,
  IconClose,
  IconLogout,
  IconExternal,
} from '../components/icons/NavIcons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

interface NavItem {
  to: string;
  label: string;
  roles: Role[];
  icon: IconComponent;
  end?: boolean;
  badgeKey?: 'stockBajo';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin', label: 'Inicio', roles: ['DEV', 'ENCARGADO', 'BARBERO'], icon: IconHome, end: true },
  { to: '/admin/turnos', label: 'Agenda y horarios', roles: ['DEV', 'ENCARGADO', 'BARBERO'], icon: IconCalendar },
  { to: '/admin/clientes', label: 'Clientes', roles: ['DEV', 'ENCARGADO', 'BARBERO'], icon: IconClients },
  { to: '/admin/cortes', label: 'Cortes', roles: ['DEV', 'ENCARGADO', 'BARBERO'], icon: IconServices },
  {
    to: '/admin/articulos',
    label: 'Articulos y stock',
    roles: ['DEV', 'ENCARGADO'],
    icon: IconStock,
    badgeKey: 'stockBajo',
  },
  { to: '/admin/ventas', label: 'Ventas', roles: ['DEV', 'ENCARGADO'], icon: IconSales },
  { to: '/admin/descuentos', label: 'Descuentos', roles: ['DEV', 'ENCARGADO'], icon: IconDiscount },
  { to: '/admin/tesoreria', label: 'Tesoreria', roles: ['DEV', 'ENCARGADO'], icon: IconTreasury },
  { to: '/admin/estadisticas', label: 'Estadisticas', roles: ['DEV', 'ENCARGADO'], icon: IconStats },
  { to: '/admin/parametrizados', label: 'Parametrizados', roles: ['DEV', 'ENCARGADO'], icon: IconCatalog },
  // Plan Integral: visible a los 3 roles (el gating es por plan, no por rol,
  // ver PlanGate).
  { to: '/admin/proveedores', label: 'Proveedores', roles: ['DEV', 'ENCARGADO', 'BARBERO'], icon: IconSuppliers },
  {
    to: '/admin/ordenes-compra',
    label: 'Ordenes de compra',
    roles: ['DEV', 'ENCARGADO', 'BARBERO'],
    icon: IconPurchaseOrders,
  },
  { to: '/admin/reportes', label: 'Reportes', roles: ['DEV', 'ENCARGADO', 'BARBERO'], icon: IconReports },
  { to: '/admin/usuarios', label: 'Usuarios', roles: ['DEV', 'ENCARGADO'], icon: IconUsers },
  { to: '/admin/jornadas', label: 'Jornadas laborales', roles: ['DEV', 'ENCARGADO'], icon: IconSchedule },
  { to: '/admin/negocio', label: 'Datos del negocio', roles: ['DEV', 'ENCARGADO'], icon: IconBusiness },
  { to: '/admin/plan', label: 'Plan', roles: ['DEV'], icon: IconPlan },
];

const MOBILE_TABS: Record<'BARBERO' | 'GESTION', { to: string; label: string; end?: boolean }[]> = {
  BARBERO: [
    { to: '/admin', label: 'Hoy', end: true },
    { to: '/admin/turnos', label: 'Agenda' },
    { to: '/admin/clientes', label: 'Clientes' },
  ],
  GESTION: [
    { to: '/admin', label: 'Hoy', end: true },
    { to: '/admin/turnos', label: 'Agenda' },
    { to: '/admin/tesoreria', label: 'Caja' },
  ],
};

const DATE_LABEL = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

const MOBILE_DATE_LABEL = new Intl.DateTimeFormat('es-AR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
}).format(new Date());

function initialsOf(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

function pageTitleFor(pathname: string) {
  const match = [...NAV_ITEMS]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));
  return match?.label ?? 'Panel';
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { settings } = useBusinessSettings();
  const location = useLocation();
  const { notifications, unreadCount, markAllRead } = useNotifications(user?.id);
  // Deriva el contador del mismo feed de notificaciones en vez de pedir
  // listStockBajoRequest aparte: antes solo se pedia una vez al montar el
  // layout, ahora se actualiza con el mismo polling que la campanita.
  const stockBajoCount = notifications.filter((n) => n.tipo === 'stock_bajo').length;
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  useEffect(() => setLogoBroken(false), [settings.logoUrl]);

  useEffect(() => {
    setMoreOpen(false);
    setAccountOpen(false);
    setFabOpen(false);
  }, [location.pathname]);

  const visibleItems = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));
  const mobileTabs = MOBILE_TABS[user?.role === 'BARBERO' ? 'BARBERO' : 'GESTION'];
  const mobileTabPaths = new Set(mobileTabs.map((tab) => tab.to));
  const moreItems = visibleItems.filter((item) => !mobileTabPaths.has(item.to));

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar" aria-label="Navegacion principal">
        <NavLink to="/admin" end className="sidebar-logo">
          {settings.logoUrl && !logoBroken ? (
            <img
              src={settings.logoUrl}
              alt=""
              className="sidebar-logo-image"
              onError={() => setLogoBroken(true)}
            />
          ) : (
            <span className="sidebar-logo-mark">K</span>
          )}
          <span className="sidebar-label">Kort</span>
        </NavLink>

        <nav className="sidebar-nav">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const showBadge = item.badgeKey === 'stockBajo' && stockBajoCount > 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
                aria-label={item.label}
                title={item.label}
              >
                <span className="sidebar-icon">
                  <Icon />
                  {showBadge && <span className="sidebar-icon-dot" aria-hidden="true" />}
                </span>
                <span className="sidebar-label">{item.label}</span>
                {showBadge && (
                  <span className="sidebar-badge sidebar-label" aria-hidden="true">
                    {stockBajoCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <button
            type="button"
            className="sidebar-footer"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-label="Cuenta"
          >
            <span className="sidebar-avatar">{initialsOf(user?.firstName, user?.lastName)}</span>
            <span className="sidebar-label sidebar-account-info">
              <span className="sidebar-account-name">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="sidebar-account-role">{user?.role}</span>
            </span>
          </button>

          {accountOpen && (
            <div className="account-popover">
              <NavLink to="/" className="account-popover-item">
                <IconExternal /> Ver sitio publico
              </NavLink>
              <button type="button" className="account-popover-item" onClick={toggleTheme}>
                {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
              </button>
              <button type="button" className="account-popover-item" onClick={logout}>
                <IconLogout /> Cerrar sesion
              </button>
            </div>
          )}
        </div>
      </aside>

      <div className="admin-content">
        <header className="mobile-header">
          <NavLink to="/admin" end className="mobile-header-brand" aria-label="Ir al inicio">
            {settings.logoUrl && !logoBroken ? (
              <img
                src={settings.logoUrl}
                alt=""
                className="mobile-header-logo-image"
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <span className="mobile-header-logo-mark">K</span>
            )}
          </NavLink>
          <div className="mobile-header-titles">
            <h1 className="mobile-header-title">{pageTitleFor(location.pathname)}</h1>
            <p className="mobile-header-subtitle">{MOBILE_DATE_LABEL}</p>
          </div>
          <div className="mobile-header-actions">
            <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={markAllRead} />
            <button
              type="button"
              className="mobile-header-account"
              onClick={() => setMoreOpen(true)}
              aria-label="Cuenta y mas opciones"
            >
              {initialsOf(user?.firstName, user?.lastName)}
            </button>
          </div>
        </header>

        {
          // La Agenda arma su propio encabezado (turnos de hoy, % de
          // ocupacion, accesos rapidos) que reemplaza a este generico.
          !location.pathname.startsWith('/admin/turnos') && (
            <header className="admin-header">
              <div>
                <h1 className="admin-header-title">{pageTitleFor(location.pathname)}</h1>
                <p className="admin-header-subtitle">{DATE_LABEL}</p>
              </div>
              <div className="admin-header-actions">
                <NotificationBell notifications={notifications} unreadCount={unreadCount} onOpen={markAllRead} />
                <NavLink to="/" className="button-secondary">
                  Ver sitio publico
                </NavLink>
                <button type="button" className="button-secondary" onClick={toggleTheme}>
                  {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                </button>
                <button type="button" className="button-secondary" onClick={logout}>
                  Cerrar sesion
                </button>
              </div>
            </header>
          )
        }

        <main className="admin-main">
          <Outlet />
        </main>

        <nav className="mobile-tabbar" aria-label="Navegacion principal">
          <div className="mobile-tabbar-pill">
            {mobileTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) => `mobile-tab${isActive ? ' active' : ''}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
          <button type="button" className="mobile-fab" onClick={() => setFabOpen(true)} aria-label="Acciones rapidas">
            +
          </button>
        </nav>

        {fabOpen && (
          <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={() => setFabOpen(false)}>
            <div className="sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-header">
                <span className="sidebar-account-name">Acciones rapidas</span>
                <button type="button" className="sheet-close" onClick={() => setFabOpen(false)} aria-label="Cerrar">
                  <IconClose />
                </button>
              </div>
              <div className="sheet-actions">
                <NavLink to="/admin/cortes" className="sheet-action-pill">
                  Registrar servicio
                </NavLink>
                <NavLink to="/admin/ventas" className="sheet-action-pill">
                  Nueva venta
                </NavLink>
                <NavLink to="/admin/clientes" className="sheet-action-pill">
                  Cliente nuevo
                </NavLink>
                <NavLink to="/admin/turnos" className="sheet-action-pill">
                  Nuevo turno
                </NavLink>
              </div>
            </div>
          </div>
        )}

        {moreOpen && (
          <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={() => setMoreOpen(false)}>
            <div className="sheet" onClick={(event) => event.stopPropagation()}>
              <div className="sheet-handle" />
              <div className="sheet-header">
                <span className="sidebar-account-name">
                  {user?.firstName} {user?.lastName} · {user?.role}
                </span>
                <button type="button" className="sheet-close" onClick={() => setMoreOpen(false)} aria-label="Cerrar">
                  <IconClose />
                </button>
              </div>
              <div className="sheet-nav">
                {moreItems.map((item) => {
                  const Icon = item.icon;
                  const showBadge = item.badgeKey === 'stockBajo' && stockBajoCount > 0;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `sheet-nav-item${isActive ? ' active' : ''}`}
                    >
                      <Icon />
                      <span>{item.label}</span>
                      {showBadge && <span className="sidebar-badge">{stockBajoCount}</span>}
                    </NavLink>
                  );
                })}
              </div>
              <div className="sheet-footer">
                <NavLink to="/" className="account-popover-item">
                  <IconExternal /> Ver sitio publico
                </NavLink>
                <button type="button" className="account-popover-item" onClick={toggleTheme}>
                  {theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                </button>
                <button type="button" className="account-popover-item" onClick={logout}>
                  <IconLogout /> Cerrar sesion
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
