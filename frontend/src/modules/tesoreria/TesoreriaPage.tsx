import { useEffect, useState } from 'react';
import { createMovimientoRequest, deleteMovimientoRequest, listMovimientosRequest } from './tesoreria.api';
import { MovimientoForm } from './MovimientoForm';
import { MOVIMIENTO_TIPO_LABELS, type Movimiento } from './tesoreria.types';
import type { MovimientoFormValues } from './tesoreria.schema';
import { BarChart } from '../../components/BarChart';
import { formatCurrency, formatDate } from '../../lib/format';

export function TesoreriaPage() {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function loadMovimientos() {
    setLoading(true);
    try {
      setMovimientos(await listMovimientosRequest());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMovimientos();
  }, []);

  async function handleCreate(values: MovimientoFormValues) {
    await createMovimientoRequest(values);
    setShowForm(false);
    await loadMovimientos();
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    await deleteMovimientoRequest(id);
    await loadMovimientos();
  }

  const costosFijos = movimientos
    .filter((m) => m.tipo === 'costo_fijo')
    .reduce((sum, m) => sum + m.monto, 0);
  const costosVariables = movimientos
    .filter((m) => m.tipo === 'costo_variable')
    .reduce((sum, m) => sum + m.monto, 0);
  const ingresos = movimientos.filter((m) => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0);

  const margenContribucion = ingresos > 0 ? 1 - costosVariables / ingresos : 0;
  const puntoEquilibrio = margenContribucion > 0 ? costosFijos / margenContribucion : costosFijos;

  return (
    <div>
      <div className="page-header">
        <h1>Tesoreria</h1>
        {!showForm && (
          <button type="button" onClick={() => setShowForm(true)}>
            Nuevo movimiento
          </button>
        )}
      </div>

      {showForm && <MovimientoForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />}

      <div className="stat-row">
        <div className="stat-tile">
          <span className="stat-label">Ingresos</span>
          <span className="stat-value">{formatCurrency(ingresos)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Costos fijos</span>
          <span className="stat-value">{formatCurrency(costosFijos)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Costos variables</span>
          <span className="stat-value">{formatCurrency(costosVariables)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Resultado</span>
          <span className="stat-value">{formatCurrency(ingresos - costosFijos - costosVariables)}</span>
        </div>
      </div>

      <div className="card">
        <h2>Punto de equilibrio</h2>
        <p className="text-muted">
          Ingreso minimo estimado para no estar en perdida:{' '}
          <strong>{formatCurrency(puntoEquilibrio)}</strong>. Calculo simplificado con los
          movimientos cargados (placeholder, a definir formula exacta con el cliente).
        </p>
        <BarChart
          data={[
            { label: 'Ingresos', value: ingresos },
            { label: 'Punto eq.', value: puntoEquilibrio },
            { label: 'Costos fijos', value: costosFijos },
            { label: 'Costos var.', value: costosVariables },
          ]}
          formatValue={formatCurrency}
        />
      </div>

      <h2>Historico de movimientos</h2>
      {loading ? (
        <p>Cargando...</p>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descripcion</th>
                <th>Monto</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {movimientos.map((m) => (
                <tr key={m.id}>
                  <td>{formatDate(m.fecha)}</td>
                  <td>{MOVIMIENTO_TIPO_LABELS[m.tipo]}</td>
                  <td>{m.categoriaNombre}</td>
                  <td>{m.descripcion ?? '-'}</td>
                  <td>{formatCurrency(m.monto)}</td>
                  <td className="data-table-actions">
                    <button type="button" onClick={() => handleDelete(m.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan={6}>No hay movimientos cargados todavia.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
