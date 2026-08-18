import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAppointmentSettingsRequest, listTurnosRequest } from '../turnos/turnos.api';
import { listStockBajoRequest } from '../articulos/articulos.api';
import { listVentasRequest } from '../ventas/ventas.api';
import { listCortesRequest } from '../cortes/cortes.api';
import type { Turno } from '../turnos/turnos.types';
import { nivelStock, type Articulo } from '../articulos/articulos.types';
import { formatCurrency, todayIso } from '../../lib/format';
import { addMinutes, nowMinutes, timeToMinutes } from '../turnos/agenda.utils';
import { useAuth } from '../auth/AuthContext';
import { ErrorState, Skeleton, toErrorMessage } from '../../components/AsyncState';

const TODAY = todayIso();
const DATE_LABEL = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'long' })
  .format(new Date())
  .toUpperCase()
  .replace(',', '');

function initialsOf(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || '?';
}

export function DashboardPage() {
  const { user } = useAuth();
  const canSeeStock = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const canSeeVentas = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [turnosHoy, setTurnosHoy] = useState<Turno[]>([]);
  const [stockBajo, setStockBajo] = useState<Articulo[]>([]);
  const [totalVentas, setTotalVentas] = useState(0);
  const [ventasCount, setVentasCount] = useState(0);
  const [cortesHoyCount, setCortesHoyCount] = useState(0);
  const [cortesEquipo, setCortesEquipo] = useState<{ nombre: string; cantidad: number }[]>([]);
  const [slotMinutos, setSlotMinutos] = useState(30);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [turnos, articulosStockBajo, ventas, cortes, settings] = await Promise.all([
          listTurnosRequest(),
          canSeeStock ? listStockBajoRequest() : Promise.resolve([]),
          canSeeVentas ? listVentasRequest({ fechaDesde: TODAY, fechaHasta: TODAY }) : Promise.resolve([]),
          listCortesRequest(),
          getAppointmentSettingsRequest(),
        ]);

        setTurnosHoy(
          turnos.filter((t) => t.fecha === TODAY).sort((a, b) => a.hora.localeCompare(b.hora))
        );
        setStockBajo(articulosStockBajo);
        setTotalVentas(ventas.reduce((sum, v) => sum + v.total, 0));
        setVentasCount(ventas.length);
        setSlotMinutos(settings.slotMinutos);

        const cortesHoy = cortes.filter((c) => c.fecha === TODAY);
        setCortesHoyCount(cortesHoy.length);
        const porBarbero = new Map<string, number>();
        cortesHoy.forEach((c) => porBarbero.set(c.barberoNombre, (porBarbero.get(c.barberoNombre) ?? 0) + 1));
        setCortesEquipo([...porBarbero.entries()].map(([nombre, cantidad]) => ({ nombre, cantidad })));
      } catch (err) {
        setError(toErrorMessage(err, 'No se pudo cargar el dashboard.'));
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSeeStock, canSeeVentas]);

  if (error) {
    return (
      <div>
        <div className="page-header">
          <h1>Inicio</h1>
        </div>
        <ErrorState message={error} />
      </div>
    );
  }

  if (loading) {
    return (
      <div>
        <div className="dash-kpi-row">
          <Skeleton style={{ height: 84, flex: 1 }} />
          <Skeleton style={{ height: 84, flex: 1 }} />
        </div>
        <Skeleton style={{ height: 150, marginBottom: 20 }} />
        <Skeleton style={{ height: 60, marginBottom: 9 }} />
        <Skeleton style={{ height: 60, marginBottom: 9 }} />
        <Skeleton style={{ height: 60 }} />
      </div>
    );
  }

  const activos = turnosHoy.filter((t) => t.estado !== 'cancelado');
  const completados = turnosHoy.filter((t) => t.estado === 'completado').length;
  const pendientesConfirmar = turnosHoy.filter((t) => t.estado === 'pendiente').length;
  const nowM = nowMinutes();

  const turnoEnCurso = activos.find((t) => {
    const inicio = timeToMinutes(t.hora);
    return t.estado !== 'completado' && nowM >= inicio && nowM < inicio + slotMinutos;
  });

  const siguientes = activos
    .filter((t) => t.id !== turnoEnCurso?.id && timeToMinutes(t.hora) >= nowM)
    .slice(0, 3);

  const progresoPct = turnoEnCurso
    ? Math.min(100, Math.max(0, ((nowM - timeToMinutes(turnoEnCurso.hora)) / slotMinutos) * 100))
    : 0;

  const kpis = [
    {
      key: 'turnos',
      label: 'Turnos hoy',
      value: String(turnosHoy.length),
      sub: `${completados} atendidos`,
      primary: true,
    },
    canSeeVentas
      ? { key: 'ventas', label: 'Cobrado hoy', value: formatCurrency(totalVentas), sub: `${ventasCount} operaciones` }
      : null,
    { key: 'cortes', label: 'Servicios hoy', value: String(cortesHoyCount), sub: 'registrados' },
    canSeeStock
      ? {
          key: 'stock',
          label: 'Alertas de stock',
          value: String(stockBajo.length),
          sub: stockBajo.length ? 'revisar stock' : 'todo en orden',
        }
      : null,
  ].filter((kpi): kpi is { key: string; label: string; value: string; sub: string; primary?: boolean } => kpi !== null);

  const maxCortes = Math.max(1, ...cortesEquipo.map((item) => item.cantidad));

  function renderCurrentCard() {
    if (!turnoEnCurso) return null;
    return (
      <div className="dash-current">
        <div className="dash-current-head">
          <span className="dash-current-label">En curso</span>
          <span className="dash-current-time font-mono">
            {turnoEnCurso.hora} - {addMinutes(turnoEnCurso.hora, slotMinutos)}
          </span>
        </div>
        <div className="dash-current-name">
          {turnoEnCurso.clienteNombre} {turnoEnCurso.clienteApellido}
        </div>
        <div className="dash-current-service">
          {turnoEnCurso.tipoCorteNombre} · {turnoEnCurso.barberoNombre}
        </div>
        <div className="dash-progress">
          <div className="dash-progress-fill" style={{ width: `${progresoPct}%` }} />
        </div>
        <div className="dash-current-actions">
          <Link to="/admin/cortes" className="button-primary">
            Registrar servicio
          </Link>
          {canSeeVentas && (
            <Link to="/admin/ventas" className="button-secondary">
              Cobrar
            </Link>
          )}
        </div>
      </div>
    );
  }

  function rowClassFor(turno: Turno) {
    if (turno.id === turnoEnCurso?.id) return 'dash-row current';
    if (turno.estado === 'pendiente') return 'dash-row pending';
    return 'dash-row';
  }

  return (
    <div>
      <div className="dash-mobile-only">
        <div className="dash-greeting">
          <div>
            <div className="dash-greeting-date">{DATE_LABEL}</div>
            <div className="dash-greeting-name">Hola, {user?.firstName}</div>
          </div>
          <div className="dash-avatar">{initialsOf(user?.firstName, user?.lastName)}</div>
        </div>

        <div className="dash-kpi-row">
          <div className="dash-kpi primary">
            <div className="dash-kpi-label">Turnos hoy</div>
            <div className="dash-kpi-value">{turnosHoy.length}</div>
            <div className="dash-kpi-sub">{completados} atendidos</div>
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-label">{canSeeVentas ? 'Cobrado' : 'Servicios hoy'}</div>
            <div className="dash-kpi-value">{canSeeVentas ? formatCurrency(totalVentas) : cortesHoyCount}</div>
            <div className="dash-kpi-sub">
              {canSeeVentas ? `${ventasCount} operaciones` : 'registrados hoy'}
            </div>
          </div>
        </div>

        {renderCurrentCard()}

        <div className="dash-section-title">
          <h2>Siguientes</h2>
          <Link to="/admin/turnos">Ver agenda</Link>
        </div>
        {siguientes.length === 0 ? (
          <p className="text-muted" style={{ marginBottom: 20 }}>
            No hay mas turnos agendados para hoy.
          </p>
        ) : (
          <div className="dash-rows">
            {siguientes.map((turno) => (
              <div key={turno.id} className={rowClassFor(turno)}>
                <span className="dash-row-time">{turno.hora}</span>
                <div>
                  <div className="dash-row-name">
                    {turno.clienteNombre} {turno.clienteApellido}
                  </div>
                  <div className="dash-row-sub">
                    {turno.tipoCorteNombre} · {turno.barberoNombre}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {canSeeStock && stockBajo.length > 0 && (
          <div className="dash-alert">
            <span className="dash-alert-dot" aria-hidden="true" />
            <span className="dash-alert-text">
              {stockBajo.length} articulo{stockBajo.length === 1 ? '' : 's'} bajo stock minimo
            </span>
            <Link to="/admin/articulos" className="dash-alert-link">
              Ver
            </Link>
          </div>
        )}
      </div>

      <div className="dash-desktop-only">
        <div className="page-header">
          <h1>Inicio</h1>
        </div>

        <div className="dash-kpi-grid">
          {kpis.map((kpi) => (
            <div key={kpi.key} className={`dash-kpi${kpi.primary ? ' primary' : ''}`}>
              <div className="dash-kpi-label">{kpi.label}</div>
              <div className="dash-kpi-value">{kpi.value}</div>
              <div className="dash-kpi-sub">{kpi.sub}</div>
            </div>
          ))}
        </div>

        <div className="dash-desktop-layout">
          <div>
            <div className="dash-section-title">
              <h2>Agenda del dia</h2>
              <Link to="/admin/turnos">Ver agenda</Link>
            </div>
            {turnosHoy.length === 0 ? (
              <p className="text-muted">No hay turnos agendados para hoy.</p>
            ) : (
              <div className="dash-rows">
                {turnosHoy.map((turno) => (
                  <div key={turno.id} className={rowClassFor(turno)}>
                    <span className="dash-row-time">{turno.hora}</span>
                    <div>
                      <div className="dash-row-name">
                        {turno.clienteNombre} {turno.clienteApellido}
                      </div>
                      <div className="dash-row-sub">
                        {turno.tipoCorteNombre} · {turno.barberoNombre}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="dash-side-card">
              <h2>Pendientes</h2>
              <div className="dash-pending-rows">
                <div className="dash-pending-row">
                  <span>Turnos a confirmar</span>
                  <strong>{pendientesConfirmar}</strong>
                </div>
                {canSeeStock && (
                  <div className="dash-pending-row">
                    <span>Articulos bajo minimo</span>
                    <strong className="danger">{stockBajo.length}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="dash-side-card">
              <h2>Equipo hoy</h2>
              {cortesEquipo.length === 0 ? (
                <p className="text-muted" style={{ marginTop: 12 }}>
                  Todavia no hay cortes registrados hoy.
                </p>
              ) : (
                <div className="dash-team-rows">
                  {cortesEquipo.map((item) => (
                    <div key={item.nombre}>
                      <div className="dash-team-row-head">
                        <span>{item.nombre}</span>
                        <strong>{item.cantidad}</strong>
                      </div>
                      <div className="dash-team-bar-track">
                        <div
                          className="dash-team-bar-fill"
                          style={{ width: `${(item.cantidad / maxCortes) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
