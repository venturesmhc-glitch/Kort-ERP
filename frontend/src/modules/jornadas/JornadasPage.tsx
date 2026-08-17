import { useEffect, useState } from 'react';
import { listJornadasRequest } from './jornadas.api';
import type { Jornada } from './jornadas.types';
import { formatDate, horasEntre } from '../../lib/format';

export function JornadasPage() {
  const [jornadas, setJornadas] = useState<Jornada[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listJornadasRequest()
      .then((data) => setJornadas([...data].sort((a, b) => b.fecha.localeCompare(a.fecha))))
      .finally(() => setLoading(false));
  }, []);

  const totalHoras = jornadas.reduce((sum, j) => sum + horasEntre(j.horaEntrada, j.horaSalida), 0);
  const totalCortes = jornadas.reduce((sum, j) => sum + j.cortesRealizados, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Jornadas laborales</h1>
      </div>
      <p className="text-muted">
        Horas trabajadas por barbero: desde el primer login del dia hasta el ultimo logout. Se
        cruza con la cantidad de cortes realizados ese dia.
      </p>

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
        <p>Cargando...</p>
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
                <tr key={jornada.id}>
                  <td>{formatDate(jornada.fecha)}</td>
                  <td>{jornada.barberoNombre}</td>
                  <td>{jornada.horaEntrada}</td>
                  <td>{jornada.horaSalida}</td>
                  <td>{horasEntre(jornada.horaEntrada, jornada.horaSalida).toFixed(1)} hs</td>
                  <td>{jornada.cortesRealizados}</td>
                </tr>
              ))}
              {jornadas.length === 0 && (
                <tr>
                  <td colSpan={6}>No hay jornadas registradas todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
