import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  createHorarioRequest,
  deleteHorarioRequest,
  getAppointmentSettingsRequest,
  listHorariosRequest,
  listTurnosRequest,
  updateAppointmentSettingsRequest,
  updateHorarioRequest,
  updateTurnoEstadoRequest,
} from './turnos.api';
import { HorarioForm } from './HorarioForm';
import { AgendaTimeline } from './AgendaTimeline';
import { DIA_LABELS, type Horario, type HorarioInput, type Turno, type TurnoEstado } from './turnos.types';
import { diaSemanaFromIso, timeToMinutes } from './agenda.utils';
import { useTodaySummary } from '../dashboard/useTodaySummary';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency, todayIso } from '../../lib/format';
import { EmptyState, ErrorState, Skeleton, toErrorMessage } from '../../components/AsyncState';
import { useToast } from '../../components/toast/ToastProvider';

type Tab = 'agenda' | 'horarios';

const TODAY = todayIso();
const DIA_SEMANA_HOY = diaSemanaFromIso(TODAY);
const HEADER_DATE_LABEL = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

export function TurnosPage() {
  const toast = useToast();
  const { user } = useAuth();
  const canManageSchedules = user?.role === 'DEV' || user?.role === 'ENCARGADO';
  const canSeeVentas = canManageSchedules;
  const canSeeStock = canManageSchedules;

  const [tab, setTab] = useState<Tab>('agenda');
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null);
  const [slotMinutos, setSlotMinutos] = useState<number | null>(null);
  const [savingSlot, setSavingSlot] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const summary = useTodaySummary(canSeeVentas, canSeeStock);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [turnosData, horariosData, settings] = await Promise.all([
        listTurnosRequest(),
        listHorariosRequest(),
        getAppointmentSettingsRequest(),
      ]);
      setTurnos([...turnosData].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)));
      setHorarios(horariosData);
      setSlotMinutos(settings.slotMinutos);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar los turnos.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleEstadoChange(id: string, estado: TurnoEstado) {
    try {
      await updateTurnoEstadoRequest(id, estado);
      await loadAll();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo actualizar el estado del turno.'));
    }
  }

  async function handleSlotMinutosSubmit(event: FormEvent) {
    event.preventDefault();
    if (!slotMinutos) return;
    setSavingSlot(true);
    try {
      await updateAppointmentSettingsRequest(slotMinutos);
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo guardar la duracion del turno.'));
    } finally {
      setSavingSlot(false);
    }
  }

  async function handleCreateHorario(values: HorarioInput) {
    await createHorarioRequest(values);
    setShowForm(false);
    await loadAll();
  }

  async function handleUpdateHorario(values: HorarioInput) {
    if (!editingHorario) return;
    await updateHorarioRequest(editingHorario.id, values);
    setEditingHorario(null);
    await loadAll();
  }

  async function handleDeleteHorario(id: string) {
    if (!confirm('¿Eliminar este horario?')) return;
    try {
      await deleteHorarioRequest(id);
      await loadAll();
    } catch (err) {
      toast.error(toErrorMessage(err, 'No se pudo eliminar el horario.'));
    }
  }

  function handleCopyBookingLink() {
    const link = `${window.location.origin}/turnos`;
    navigator.clipboard
      .writeText(link)
      .then(() => setCopied(true))
      .catch(() => toast.error('No se pudo copiar el link.'));
  }

  const turnosHoy = turnos.filter((t) => t.fecha === TODAY && t.estado !== 'cancelado');
  const pendientesConfirmar = turnos.filter((t) => t.fecha === TODAY && t.estado === 'pendiente').length;
  const totalSlotsHoy =
    slotMinutos && slotMinutos > 0
      ? horarios
          .filter((h) => h.dia === DIA_SEMANA_HOY)
          .reduce(
            (sum, h) => sum + Math.max(0, Math.floor((timeToMinutes(h.horaFin) - timeToMinutes(h.horaInicio)) / slotMinutos)),
            0
          )
      : 0;
  const ocupacionPct = totalSlotsHoy > 0 ? Math.round((turnosHoy.length / totalSlotsHoy) * 100) : 0;
  const maxCortes = Math.max(1, ...summary.cortesEquipo.map((item) => item.cantidad));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>{tab === 'agenda' ? 'Agenda del dia' : 'Horarios de atencion'}</h1>
          {tab === 'agenda' && (
            <p className="page-header-subtitle">
              {HEADER_DATE_LABEL} · {turnosHoy.length} turno{turnosHoy.length === 1 ? '' : 's'}
              {totalSlotsHoy > 0 && ` · ${ocupacionPct}% de ocupacion`}
            </p>
          )}
        </div>
        <div className="page-header-actions">
          {tab === 'agenda' ? (
            canManageSchedules && (
              <>
                <Link to="/admin/ventas" className="button-secondary">
                  Nueva venta
                </Link>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => {
                    setCopied(false);
                    setShareOpen(true);
                  }}
                >
                  Nuevo turno
                </button>
              </>
            )
          ) : (
            canManageSchedules &&
            !showForm &&
            !editingHorario && (
              <button type="button" className="button-primary" onClick={() => setShowForm(true)}>
                Nuevo horario
              </button>
            )
          )}
        </div>
      </div>

      <div className="tabs">
        <button
          type="button"
          className={tab === 'agenda' ? 'tab active' : 'tab'}
          onClick={() => setTab('agenda')}
        >
          Agenda
        </button>
        <button
          type="button"
          className={tab === 'horarios' ? 'tab active' : 'tab'}
          onClick={() => setTab('horarios')}
        >
          Horarios de atencion
        </button>
      </div>

      {loading ? (
        <div>
          <Skeleton style={{ height: 60, marginBottom: 9 }} />
          <Skeleton style={{ height: 60, marginBottom: 9 }} />
          <Skeleton style={{ height: 60 }} />
        </div>
      ) : error ? (
        <ErrorState message={error} />
      ) : tab === 'agenda' ? (
        turnos.length === 0 ? (
          <EmptyState message="No hay turnos solicitados todavia." />
        ) : (
          <div className="agenda-layout">
            <div className="agenda-layout-main">
              <AgendaTimeline
                turnos={turnos}
                horarios={horarios}
                slotMinutos={slotMinutos ?? 30}
                onEstadoChange={handleEstadoChange}
              />
            </div>
            <aside className="agenda-side">
              {canSeeVentas && (
                <div className="dash-side-card primary">
                  <div className="dash-kpi-label">Cobrado hoy</div>
                  <div className="dash-kpi-value">{formatCurrency(summary.totalVentas)}</div>
                  <div className="dash-kpi-sub">
                    {summary.ventasCount} operaciones
                    {summary.ventasCount > 0 && ` · ticket ${formatCurrency(summary.totalVentas / summary.ventasCount)}`}
                  </div>
                </div>
              )}

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
                      <strong className="danger">{summary.stockBajoCount}</strong>
                    </div>
                  )}
                </div>
              </div>

              <div className="dash-side-card">
                <h2>Equipo hoy</h2>
                {summary.cortesEquipo.length === 0 ? (
                  <p className="text-muted" style={{ marginTop: 12 }}>
                    Todavia no hay cortes registrados hoy.
                  </p>
                ) : (
                  <div className="dash-team-rows">
                    {summary.cortesEquipo.map((item) => (
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
            </aside>
          </div>
        )
      ) : (
        <div>
          {canManageSchedules && slotMinutos !== null && (
            <form className="client-form" onSubmit={handleSlotMinutosSubmit} style={{ marginBottom: '1.5rem' }}>
              <label htmlFor="slotMinutos">Duracion del turno para todos los barberos (minutos)</label>
              <input
                id="slotMinutos"
                type="number"
                min="10"
                step="5"
                value={slotMinutos}
                onChange={(e) => setSlotMinutos(Number(e.target.value))}
              />
              <div className="client-form-actions">
                <button type="submit" disabled={savingSlot}>
                  {savingSlot ? 'Guardando...' : 'Guardar duracion'}
                </button>
              </div>
            </form>
          )}

          {showForm && (
            <HorarioForm onSubmit={handleCreateHorario} onCancel={() => setShowForm(false)} />
          )}
          {editingHorario && (
            <HorarioForm
              initialValues={{
                barberoId: editingHorario.barberoId,
                barberoNombre: editingHorario.barberoNombre,
                dia: editingHorario.dia,
                horaInicio: editingHorario.horaInicio,
                horaFin: editingHorario.horaFin,
              }}
              onSubmit={handleUpdateHorario}
              onCancel={() => setEditingHorario(null)}
            />
          )}
          <div className="table-wrap table-wrap--cards">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barbero</th>
                  <th>Dia</th>
                  <th>Horario</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario) => (
                  <tr key={horario.id}>
                    <td data-label="Barbero">{horario.barberoNombre}</td>
                    <td data-label="Dia">{DIA_LABELS[horario.dia]}</td>
                    <td data-label="Horario" className="font-mono">
                      {horario.horaInicio} - {horario.horaFin}
                    </td>
                    <td className="data-table-actions" data-label="">
                      {canManageSchedules && (
                        <>
                          <button type="button" onClick={() => setEditingHorario(horario)}>
                            Editar
                          </button>
                          <button type="button" onClick={() => handleDeleteHorario(horario.id)}>
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {horarios.length === 0 && (
                  <tr>
                    <td colSpan={4} data-label="">
                      <EmptyState message="No hay horarios cargados todavia." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={() => setShareOpen(false)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <span className="sidebar-account-name">Nuevo turno</span>
            </div>
            <p className="text-muted">
              Los turnos los reserva el cliente desde su link de reserva. Compartilo por WhatsApp o donde prefieras.
            </p>
            <div className="sheet-actions">
              <button type="button" className="sheet-action-pill" onClick={handleCopyBookingLink}>
                {copied ? 'Link copiado' : 'Copiar link de reserva'}
              </button>
              <Link to="/admin/clientes" className="sheet-action-pill" onClick={() => setShareOpen(false)}>
                Cargar cliente nuevo
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
