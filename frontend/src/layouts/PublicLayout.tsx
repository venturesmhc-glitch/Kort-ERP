import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useBusinessSettings } from '../modules/business-settings/BusinessSettingsContext';
import { useBusinessTheme } from '../config/useBusinessTheme';

export function PublicLayout() {
  useBusinessTheme();
  const { settings } = useBusinessSettings();

  const { name, logoUrl, headerImageUrl, footerImageUrl, badge, poweredBy } = settings;
  const year = new Date().getFullYear();

  return (
    <div className="public-shell">
      <header
        className={headerImageUrl ? 'public-header public-header-banner' : 'public-header'}
        style={headerImageUrl ? { backgroundImage: `url(${headerImageUrl})` } : undefined}
      >
        {headerImageUrl && <div className="public-header-overlay" aria-hidden="true" />}
        <div className="public-header-content">
          <NavLink to="/" end className="public-brand">
            {logoUrl ? (
              <img src={logoUrl} alt={name} className="public-logo-image" />
            ) : (
              <span className="public-logo">{name}</span>
            )}
            {badge.enabled && badge.text && (
              <span className="business-badge" style={{ backgroundColor: badge.color }}>
                {badge.text}
              </span>
            )}
          </NavLink>
          <nav className="public-nav">
            <NavLink to="/" end>
              Inicio
            </NavLink>
            <NavLink to="/turnos">Solicitar turno</NavLink>
            <NavLink to="/tienda">Tienda</NavLink>
            <NavLink to="/contacto">Contacto</NavLink>
          </nav>
          <div className="public-header-actions">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        {footerImageUrl && <img src={footerImageUrl} alt={name} className="public-footer-image" />}
        <p>
          {name} — {year}
        </p>
        {poweredBy.enabled && poweredBy.text && (
          <p className="public-footer-powered">{poweredBy.text}</p>
        )}
      </footer>
    </div>
  );
}
