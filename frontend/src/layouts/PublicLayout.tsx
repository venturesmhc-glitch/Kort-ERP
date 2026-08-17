import { NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';

export function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <NavLink to="/" end className="public-logo">
          Kort
        </NavLink>
        <nav className="public-nav">
          <NavLink to="/" end>
            Inicio
          </NavLink>
          <NavLink to="/turnos">Solicitar turno</NavLink>
          <NavLink to="/tienda">Tienda</NavLink>
        </nav>
        <div className="public-header-actions">
          <ThemeToggle />
          <NavLink to="/login" className="public-login-link">
            Acceso panel
          </NavLink>
        </div>
      </header>

      <main className="public-main">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>Kort — Sistema de gestion integral para barberias.</p>
      </footer>
    </div>
  );
}
