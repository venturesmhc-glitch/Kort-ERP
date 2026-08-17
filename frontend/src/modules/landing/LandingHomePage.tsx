import { Link } from 'react-router-dom';

export function LandingHomePage() {
  return (
    <div>
      <section className="public-hero">
        <h1>Reserva tu turno en Kort</h1>
        <p>Elegi tu barbero, tu horario y el tipo de corte que buscas, en minutos.</p>
        <div className="public-hero-actions">
          <Link to="/turnos" className="button-primary">
            Solicitar turno
          </Link>
          <Link to="/tienda" className="button-secondary">
            Ver tienda
          </Link>
        </div>
      </section>

      <section className="card-grid">
        <div className="card">
          <h2>Turnos online</h2>
          <p>Reserva en minutos, eligiendo barbero, horario disponible y tipo de corte.</p>
        </div>
        <div className="card">
          <h2>Tienda de merchandising</h2>
          <p>Cosmetica, indumentaria y accesorios, listos para retirar el dia de tu turno.</p>
        </div>
        <div className="card">
          <h2>Confirmacion y recordatorios</h2>
          <p>
            Recibis la confirmacion por mail al reservar y un recordatorio por WhatsApp 6 horas
            antes de tu turno.
          </p>
        </div>
      </section>
    </div>
  );
}
