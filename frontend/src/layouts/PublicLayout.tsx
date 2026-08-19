import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { useBusinessSettings } from '../modules/business-settings/BusinessSettingsContext';
import { useBusinessTheme } from '../config/useBusinessTheme';

export function PublicLayout() {
  useBusinessTheme();
  const { settings, loading } = useBusinessSettings();

  const { name, logoUrl, headerImageUrl, footerImageUrl, badge, poweredBy } = settings;
  const year = new Date().getFullYear();

  // Si la URL de logo/footer es invalida o el recurso cae, mostramos un
  // fallback (nombre del negocio, u ocultar directamente) en vez del icono
  // de imagen rota del navegador.
  const [logoBroken, setLogoBroken] = useState(false);
  const [footerImageBroken, setFooterImageBroken] = useState(false);
  useEffect(() => setLogoBroken(false), [logoUrl]);
  useEffect(() => setFooterImageBroken(false), [footerImageUrl]);

  return (
    <div className="public-shell">
      <header
        className={headerImageUrl ? 'public-header public-header-banner' : 'public-header'}
        style={headerImageUrl ? { backgroundImage: `url(${headerImageUrl})` } : undefined}
      >
        {headerImageUrl && <div className="public-header-overlay" aria-hidden="true" />}
        <div className="public-header-content">
          <NavLink to="/" end className="public-brand">
            {loading ? (
              <span className="public-logo-skeleton skeleton" aria-hidden="true" />
            ) : logoUrl && !logoBroken ? (
              <img
                src={logoUrl}
                alt={name}
                className="public-logo-image"
                onError={() => setLogoBroken(true)}
              />
            ) : (
              <span className="public-logo">{name}</span>
            )}
            {!loading && badge.enabled && badge.text && (
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
        {footerImageUrl && !footerImageBroken && (
          <img
            src={footerImageUrl}
            alt={name}
            className="public-footer-image"
            onError={() => setFooterImageBroken(true)}
          />
        )}
        {loading ? (
          <span className="public-footer-skeleton skeleton" aria-hidden="true" />
        ) : (
          <p>
            {name} — {year}
          </p>
        )}
        {!loading && poweredBy.enabled && poweredBy.text && (
          <p className="public-footer-powered">{poweredBy.text}</p>
        )}
      </footer>
    </div>
  );
}
