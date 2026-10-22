import { useEffect, useState } from 'react';
import { listComisionesRequest, type ListComisionesFiltros } from './comisiones.api';
import type { CommissionRow } from './comisiones.types';
import { formatCurrency, todayIso } from '../../lib/format';
import { EmptyState, ErrorState, PageSkeleton, toErrorMessage } from '../../components/AsyncState';

function inicioDeMes() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function ComisionesPage() {
  const [filas, setFilas] = useState<CommissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<ListComisionesFiltros>({
    fechaDesde: inicioDeMes(),
    fechaHasta: todayIso(),
  });

  async function load(activeFiltros: ListComisionesFiltros) {
    setLoading(true);
    setError(null);
    try {
      const data = await listComisionesRequest(activeFiltros);
      setFilas(data);
    } catch (err) {
      setError(toErrorMessage(err, 'No se pudieron cargar las comisiones.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(filtros);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalComision = filas.reduce((sum, f) => sum + f.totalComision, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Comisiones</h1>
      </div>
      <p className="text-muted">
        Comision de cada barbero sobre el monto de sus cortes y ventas en el periodo, segun el
        porcentaje configurado en Usuarios.
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
          <span className="stat-label">Comision total del periodo</span>
          <span className="stat-value">{formatCurrency(totalComision)}</span>
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
                <th>Barbero</th>
                <th>Comision</th>
                <th>Cortes</th>
                <th>Monto cortes</th>
                <th>Ventas</th>
                <th>Monto ventas</th>
                <th>Comision total</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((fila) => (
                <tr key={fila.barberoId}>
                  <td>{fila.barberoNombre}</td>
                  <td>{fila.commissionRate}%</td>
                  <td>{fila.cortesCantidad}</td>
                  <td>{formatCurrency(fila.cortesMonto)}</td>
                  <td>{fila.ventasCantidad}</td>
                  <td>{formatCurrency(fila.ventasMonto)}</td>
                  <td>{formatCurrency(fila.totalComision)}</td>
                </tr>
              ))}
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState message="No hay barberos activos para mostrar en el periodo." />
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
