import { useEffect, useState } from 'react';
import {
  createHorarioRequest,
  deleteHorarioRequest,
  deleteTurnoRequest,
  listHorariosRequest,
  listTurnosRequest,
  updateHorarioRequest,
  updateTurnoEstadoRequest,
} from './turnos.api';
import { HorarioForm } from './HorarioForm';
import {
  DIA_LABELS,
  TURNO_ESTADO_LABELS,
  type Horario,
  type HorarioInput,
  type Turno,
  type TurnoEstado,
} from './turnos.types';
import { formatDate } from '../../lib/format';

type Tab = 'agenda' | 'horarios';

export function TurnosPage() {
  const [tab, setTab] = useState<Tab>('agenda');
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [horarios, setHorarios] = useState<Horario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingHorario, setEditingHorario] = useState<Horario | null>(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [turnosData, horariosData] = await Promise.all([listTurnosRequest(), listHorariosRequest()]);
      setTurnos([...turnosData].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)));
      setHorarios(horariosData);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function handleEstadoChange(id: string, estado: TurnoEstado) {
    await updateTurnoEstadoRequest(id, estado);
    await loadAll();
  }

  async function handleDeleteTurno(id: string) {
    if (!confirm('¿Eliminar este turno?')) return;
    await deleteTurnoRequest(id);
    await loadAll();
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
    await deleteHorarioRequest(id);
    await loadAll();
  }

  return (
    <div>
      <div className="page-header">
        <h1>Turnos y horarios de atencion</h1>
        {tab === 'horarios' && !showForm && !editingHorario && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo horario
          </button>
        )}
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
        <p>Cargando...</p>
      ) : tab === 'agenda' ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Cliente</th>
                <th>Barbero</th>
                <th>Tipo de corte</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno) => (
                <tr key={turno.id}>
                  <td>{turno.codigo}</td>
                  <td>{formatDate(turno.fecha)}</td>
                  <td>{turno.hora}</td>
                  <td>
                    {turno.clienteNombre} {turno.clienteApellido} · {turno.clienteTelefono}
                  </td>
                  <td>{turno.barberoNombre}</td>
                  <td>{turno.tipoCorteNombre}</td>
                  <td>
                    <select
                      value={turno.estado}
                      onChange={(e) => handleEstadoChange(turno.id, e.target.value as TurnoEstado)}
                    >
                      {Object.entries(TURNO_ESTADO_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => handleDeleteTurno(turno.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {turnos.length === 0 && (
                <tr>
                  <td colSpan={8}>No hay turnos solicitados todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div>
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
                slotMinutos: editingHorario.slotMinutos,
              }}
              onSubmit={handleUpdateHorario}
              onCancel={() => setEditingHorario(null)}
            />
          )}
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Barbero</th>
                  <th>Dia</th>
                  <th>Horario</th>
                  <th>Duracion turno</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {horarios.map((horario) => (
                  <tr key={horario.id}>
                    <td>{horario.barberoNombre}</td>
                    <td>{DIA_LABELS[horario.dia]}</td>
                    <td>
                      {horario.horaInicio} - {horario.horaFin}
                    </td>
                    <td>{horario.slotMinutos} min</td>
                    <td className="data-table-actions">
                      <button type="button" onClick={() => setEditingHorario(horario)}>
                        Editar
                      </button>
                      <button type="button" onClick={() => handleDeleteHorario(horario.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {horarios.length === 0 && (
                  <tr>
                    <td colSpan={5}>No hay horarios cargados todavia.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
