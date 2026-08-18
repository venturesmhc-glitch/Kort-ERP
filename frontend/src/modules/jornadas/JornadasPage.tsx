import { useEffect, useState } from 'react';
import { listJornadasRequest, type ListJornadasFiltros } from './jornadas.api';
import type { Jornada } from './jornadas.types';
import { formatDate, todayIso } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';

function inicioDeMes() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatHora(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function JornadasPage() {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<ListJornadasFiltros>({
    fechaDesde: inicioDeMes(),
    fechaHasta: todayIso(),
  });

  async function load(activeFiltros: ListJornadasFiltros) {
    setLoading(true);
    setError(null);
    try {
      const data = await listJornadasRequest(activeFiltros);
      setJornadas(data);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar las jornadas.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHoras = jornadas.reduce((sum, j) => sum + j.horasTrabajadas, 0);
  const totalCortes = jornadas.reduce((sum, j) => sum + j.cortesRealizados, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Jornadas laborales</h1>
      </div>
      <p className="text-muted">
        Horas trabajadas por barbero: desde el primer login del dia hasta el ultimo logout (o el
        cierre por inactividad, a las 2 hs). Se cruza con la cantidad de cortes realizados ese dia.
      </p>

      <div className="client-form" style={{ marginBottom: '1rem' }}>
        <label htmlFor="fechaDesde">Desde</label>
        <input
          id="fechaDesde"
          type="date"
          value={filtros.fechaDesde ?? ''}
          onChange={(e) => setFiltros((prev) => ({ ...prev, fechaDesde: e.target.value || undefined }))}
        />
        <label htmlFor="fechaHasta">Hasta</label>
        <input
          id="fechaHasta"
          type="date"
          value={filtros.fechaHasta ?? ''}
          onChange={(e) => setFiltros((prev) => ({ ...prev, fechaHasta: e.target.value || undefined }))}
        />
        <button type="button" onClick={() => load(filtros)}>
          Filtrar
        </button>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Horas registradas</span>
          <span className="stat-value">{totalHoras.toFixed(1)} hs</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Cortes en el periodo</span>
          <span className="stat-value">{totalCortes}</span>
        </div>
      </div>

      {loading ? (
        <PageSkeleton />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Barbero</th>
                <th>Entrada</th>
                <th>Salida</th>
                <th>Horas trabajadas</th>
                <th>Cortes realizados</th>
              </tr>
            </thead>
            <tbody>
              {jornadas.map((jornada) => (
                <tr key={`${jornada.barberoId}-${jornada.fecha}`}>
                  <td>{formatDate(jornada.fecha)}</td>
                  <td>{jornada.barberoNombre}</td>
                  <td>{formatHora(jornada.entrada)}</td>
                  <td>{jornada.sesionAbierta ? 'En curso' : formatHora(jornada.salida)}</td>
                  <td>{jornada.horasTrabajadas.toFixed(1)} hs</td>
                  <td>{jornada.cortesRealizados}</td>
                </tr>
              ))}
              {jornadas.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <EmptyState message="No hay jornadas registradas en el periodo." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
