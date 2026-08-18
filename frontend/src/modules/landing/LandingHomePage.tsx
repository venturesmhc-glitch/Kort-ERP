import { Link } from 'react-router-dom';
import { useBusinessSettings } from '../business-settings/BusinessSettingsContext';
import { IconBell, IconCalendar, IconStock } from '../../components/icons/NavIcons';

export function LandingHomePage() {
  const { settings } = useBusinessSettings();
  const { address, hours } = settings.contact;

  return (
    <div>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Reserva online</span>
          <h1>{settings.name}</h1>
          {settings.tagline && <p>{settings.tagline}</p>}
          <div className="landing-hero-actions">
            <Link to="/turnos" className="button-primary landing-cta">
              Solicitar turno
            </Link>
            <Link to="/tienda" className="button-secondary landing-cta">
              Ver tienda
            </Link>
          </div>
        </div>

        <div className="landing-hero-panel" aria-hidden="true">
          <span className="landing-hero-panel-mark">
            <svg width="30" height="30" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3">
              <circle cx="4.5" cy="5" r="1.8" />
              <circle cx="4.5" cy="13" r="1.8" />
              <line x1="6" y1="6.2" x2="15.5" y2="15.5" />
              <line x1="6" y1="11.8" x2="15.5" y2="2.5" />
            </svg>
          </span>
          <p className="landing-hero-panel-text">Turnos, tienda y recordatorios en un mismo link.</p>
        </div>
      </section>

      <section className="landing-features">
        <div className="landing-feature-card">
          <span className="landing-feature-icon">
            <IconCalendar />
          </span>
          <h2>Turnos online</h2>
          <p>Reserva en minutos, eligiendo barbero, horario disponible y tipo de corte.</p>
        </div>
        <div className="landing-feature-card">
          <span className="landing-feature-icon">
            <IconStock />
          </span>
          <h2>Tienda de merchandising</h2>
          <p>Cosmetica, indumentaria y accesorios, listos para retirar el dia de tu turno.</p>
        </div>
        <div className="landing-feature-card">
          <span className="landing-feature-icon">
            <IconBell />
          </span>
          <h2>Confirmacion y recordatorios</h2>
          <p>Recibis la confirmacion por mail al reservar y un recordatorio por WhatsApp 6 horas antes.</p>
        </div>
      </section>

      {(address || hours) && (
        <section className="landing-info-band">
          <div>
            {address && <div className="landing-info-row">{address}</div>}
            {hours && <div className="landing-info-row text-muted">{hours}</div>}
          </div>
          <Link to="/contacto" className="button-secondary">
            Como llegar
          </Link>
        </section>
      )}
    </div>
  );
}
