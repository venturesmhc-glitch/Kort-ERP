import { useEffect, useMemo, useState } from 'react';
import { listBarberosRequest } from '../users/users.api';
import type { AppUser } from '../users/users.types';
import { TURNO_ESTADO_LABELS, type Horario, type Turno, type TurnoEstado } from './turnos.types';
import { diaSemanaFromIso, nowMinutes, timeToMinutes } from './agenda.utils';
import { formatDate, shiftIso, todayIso } from '../../lib/format';
import { EmptyState } from '../../components/AsyncState';

const HOUR_HEIGHT = 60;
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 20;

interface AgendaTimelineProps {
  turnos: Turno[];
  horarios: Horario[];
  slotMinutos: number;
  onEstadoChange: (id: string, estado: TurnoEstado) => Promise<void>;
}

function computeFreeGaps(rangeStart: number, rangeEnd: number, occupied: [number, number][], minGap: number) {
  const gaps: [number, number][] = [];
  let cursor = rangeStart;
  for (const [start, end] of occupied) {
    if (start > cursor) gaps.push([cursor, Math.min(start, rangeEnd)]);
    cursor = Math.max(cursor, end);
  }
  if (cursor < rangeEnd) gaps.push([cursor, rangeEnd]);
  return gaps.filter(([start, end]) => end - start >= minGap);
}

export function AgendaTimeline({ turnos, horarios, slotMinutos, onEstadoChange }: AgendaTimelineProps) {
  const [barberos, setBarberos] = useState<AppUser[]>([]);
  const [profesionalFiltro, setProfesionalFiltro] = useState<string | 'todos'>('todos');
  const [fechaSeleccionada, setFechaSeleccionada] = useState(todayIso());
  const [turnoAbierto, setTurnoAbierto] = useState<Turno | null>(null);

  useEffect(() => {
    listBarberosRequest()
      .then(setBarberos)
      .catch(() => undefined);
  }, []);

  const diaSemana = diaSemanaFromIso(fechaSeleccionada);
  const dateTurnos = useMemo(
    () => turnos.filter((t) => t.fecha === fechaSeleccionada),
    [turnos, fechaSeleccionada]
  );

  const barberosToShow = profesionalFiltro === 'todos' ? barberos : barberos.filter((b) => b.id === profesionalFiltro);

  const { startHour, endHour } = useMemo(() => {
    const points: number[] = [];
    horarios
      .filter((h) => h.dia === diaSemana && (profesionalFiltro === 'todos' || h.barberoId === profesionalFiltro))
      .forEach((h) => {
        points.push(timeToMinutes(h.horaInicio), timeToMinutes(h.horaFin));
      });
    dateTurnos
      .filter((t) => profesionalFiltro === 'todos' || t.barberoId === profesionalFiltro)
      .forEach((t) => {
        points.push(timeToMinutes(t.hora), timeToMinutes(t.hora) + slotMinutos);
      });
    if (points.length === 0) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR };
    const min = Math.min(...points, DEFAULT_START_HOUR * 60);
    const max = Math.max(...points, DEFAULT_END_HOUR * 60);
    return { startHour: Math.floor(min / 60), endHour: Math.ceil(max / 60) };
  }, [horarios, dateTurnos, diaSemana, profesionalFiltro, slotMinutos]);

  const hours = Array.from({ length: Math.max(1, endHour - startHour) }, (_, i) => startHour + i);
  const trackHeight = (endHour - startHour) * HOUR_HEIGHT;
  const rangeStartMin = startHour * 60;
  const isToday = fechaSeleccionada === todayIso();
  const nowM = nowMinutes();
  const nowTop = ((nowM - rangeStartMin) / 60) * HOUR_HEIGHT;
  const showNowLine = isToday && nowM >= rangeStartMin && nowM <= endHour * 60;

  const dateLabel = formatDate(fechaSeleccionada).replace(/\/\d{4}$/, '');

  function eventaStyleFor(turno: Turno) {
    const top = ((timeToMinutes(turno.hora) - rangeStartMin) / 60) * HOUR_HEIGHT + 1;
    // El alto nunca puede superar el espacio real entre turnos consecutivos
    // (slotMinutos en pixeles) o dos turnos seguidos se pisan visualmente.
    const height = Math.max(18, (slotMinutos / 60) * HOUR_HEIGHT - 2);
    return { top, height };
  }

  function estadoDeTurno(turno: Turno): 'current' | 'pending' | 'cancelled' | 'normal' {
    if (turno.estado === 'cancelado') return 'cancelled';
    const inicio = timeToMinutes(turno.hora);
    if (isToday && turno.estado !== 'completado' && nowM >= inicio && nowM < inicio + slotMinutos) return 'current';
    if (turno.estado === 'pendiente') return 'pending';
    return 'normal';
  }

  function renderColumn(barbero: AppUser) {
    const eventos = dateTurnos.filter((t) => t.barberoId === barbero.id);
    const horario = horarios.find((h) => h.barberoId === barbero.id && h.dia === diaSemana);
    // Incluye los cancelados: siguen dibujandose en su horario, asi que ese
    // espacio no puede marcarse "Libre" tambien o el hueco queda superpuesto
    // con la tarjeta del turno cancelado.
    const occupied: [number, number][] = eventos
      .map((t): [number, number] => [timeToMinutes(t.hora), timeToMinutes(t.hora) + slotMinutos])
      .sort((a, b) => a[0] - b[0]);
    const gaps = horario
      ? computeFreeGaps(
          Math.max(rangeStartMin, timeToMinutes(horario.horaInicio)),
          Math.min(endHour * 60, timeToMinutes(horario.horaFin)),
          occupied,
          slotMinutos
        )
      : [];

    return (
      <div className="agenda-column" key={barbero.id}>
        <div className="agenda-column-head">{barbero.firstName}</div>
        <div className="agenda-column-track" style={{ height: trackHeight }}>
          {showNowLine && (
            <div className="agenda-now-line" style={{ top: nowTop }}>
              <span className="agenda-now-label font-mono">AHORA</span>
            </div>
          )}
          {gaps.map(([start, end]) => (
            <div
              key={`gap-${start}`}
              className="agenda-gap"
              style={{ top: ((start - rangeStartMin) / 60) * HOUR_HEIGHT + 1, height: ((end - start) / 60) * HOUR_HEIGHT - 2 }}
            >
              Libre
            </div>
          ))}
          {eventos.map((turno) => {
            const estado = estadoDeTurno(turno);
            const { top, height } = eventaStyleFor(turno);
            const progresoPct =
              estado === 'current'
                ? Math.min(100, Math.max(0, ((nowM - timeToMinutes(turno.hora)) / slotMinutos) * 100))
                : 0;
            return (
              <button
                key={turno.id}
                type="button"
                className={`agenda-event${estado !== 'normal' ? ` ${estado}` : ''}`}
                style={{ top, height }}
                onClick={() => setTurnoAbierto(turno)}
              >
                <div className="agenda-event-name">
                  {turno.clienteNombre} {turno.clienteApellido}
                </div>
                <div className="agenda-event-sub">
                  {turno.tipoCorteNombre} · {turno.hora}
                </div>
                {estado === 'current' && (
                  <div className="agenda-event-progress">
                    <div className="agenda-event-progress-fill" style={{ width: `${progresoPct}%` }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="agenda-toolbar">
        <div className="agenda-toolbar-pills">
          <button
            type="button"
            className={`agenda-pill${profesionalFiltro === 'todos' ? ' active' : ''}`}
            onClick={() => setProfesionalFiltro('todos')}
          >
            Todos
          </button>
          {barberos.map((barbero) => (
            <button
              key={barbero.id}
              type="button"
              className={`agenda-pill${profesionalFiltro === barbero.id ? ' active' : ''}`}
              onClick={() => setProfesionalFiltro(barbero.id)}
            >
              {barbero.firstName}
            </button>
          ))}
        </div>
        <div className="agenda-date-nav">
          <button
            type="button"
            className="agenda-date-btn"
            onClick={() => setFechaSeleccionada((f) => shiftIso(f, -1))}
            aria-label="Dia anterior"
          >
            ‹
          </button>
          <span className="agenda-date-label">{dateLabel}</span>
          <button
            type="button"
            className="agenda-date-btn"
            onClick={() => setFechaSeleccionada((f) => shiftIso(f, 1))}
            aria-label="Dia siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {barberosToShow.length === 0 ? (
        <EmptyState message="No hay profesionales activos para mostrar la agenda." />
      ) : (
        <div className="agenda-body">
          <div className="agenda-hours-rail">
            {hours.map((hour) => (
              <div key={hour}>{String(hour).padStart(2, '0')}:00</div>
            ))}
          </div>
          <div className="agenda-columns">{barberosToShow.map(renderColumn)}</div>
        </div>
      )}

      {turnoAbierto && (
        <div className="sheet-overlay" role="dialog" aria-modal="true" onClick={() => setTurnoAbierto(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-handle" />
            <div className="sheet-header">
              <span className="sidebar-account-name">
                {turnoAbierto.clienteNombre} {turnoAbierto.clienteApellido}
              </span>
            </div>
            <div>
              <div className="agenda-detail-row">
                <span className="agenda-detail-label">Codigo</span>
                <span className="font-mono">{turnoAbierto.codigo}</span>
              </div>
              <div className="agenda-detail-row">
                <span className="agenda-detail-label">Cuando</span>
                <span>
                  {formatDate(turnoAbierto.fecha)} · {turnoAbierto.hora}
                </span>
              </div>
              <div className="agenda-detail-row">
                <span className="agenda-detail-label">Con</span>
                <span>{turnoAbierto.barberoNombre}</span>
              </div>
              <div className="agenda-detail-row">
                <span className="agenda-detail-label">Servicio</span>
                <span>{turnoAbierto.tipoCorteNombre}</span>
              </div>
              <div className="agenda-detail-row">
                <span className="agenda-detail-label">Telefono</span>
                <span>{turnoAbierto.clienteTelefono}</span>
              </div>
            </div>
            <div className="agenda-status-actions">
              {Object.entries(TURNO_ESTADO_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`agenda-status-pill${turnoAbierto.estado === key ? ' active' : ''}`}
                  disabled={turnoAbierto.estado === key}
                  onClick={async () => {
                    await onEstadoChange(turnoAbierto.id, key as TurnoEstado);
                    setTurnoAbierto(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
